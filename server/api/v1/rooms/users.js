"use strict";

var restful             = require('../../../services/restful');
var roomService         = require('../../../services/room-service');
var emailAddressService = require('../../../services/email-address-service');
var userService         = require("../../../services/user-service");
var restSerializer      = require("../../../serializers/rest-serializer");
var mongoUtils          = require('../../../utils/mongo-utils');
var troupeService       = require("../../../services/troupe-service");
var StatusError         = require('statuserror');
var paramLoaders        = require('./param-loaders');

function maskEmail(email) {
  return email
    .split('@')
    .map(function (item, index) {
      if (index === 0) return item.slice(0, 4) + '****';
      return item;
    })
    .join('@');
}

function getTroupeUserFromId(troupeId, userId) {
  return troupeService.findByIdLeanWithAccess(troupeId, userId)
    .spread(function(troupe, access) {
      if (!access) return;

      return userService.findById(userId);
    });
}

function getTroupeUserFromUsername(troupeId, username) {
  return userService.findByUsername(username)
    .then(function(user) {
      return troupeService.findByIdLeanWithAccess(troupeId, user.id)
        .spread(function(troupe, access) {
          if (!access) return;

          return user;
        });
      });
}

module.exports = {
  id: 'resourceTroupeUser',

  index: function(req, res, next) {

    var options = {
      lean: !!req.query.lean,
      limit: req.query.limit && parseInt(req.query.limit, 10) || undefined,
      searchTerm: req.query.q
    };

    restful.serializeUsersForTroupe(req.params.troupeId, req.user && req.user.id, options)
      .then(function (data) {
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  },

  create: [paramLoaders.troupeLoader, function(req, res, next) {
    var username = req.body.username;

    return roomService.addUserToRoom(req.troupe, req.user, username)
      .then(function(addedUser) {
        var strategy = new restSerializer.UserStrategy();

        return [
          restSerializer.serialize(addedUser, strategy),
          emailAddressService(addedUser)
        ];
      })
      .spread(function(serializedUser, email) {
        if (serializedUser.invited && email) {
          serializedUser.email = maskEmail(email);
        }

        res.status(200).send({ success: true, user: serializedUser });
      })
      .catch(next);
  }],

  /**
   * Removes a member from a room. A user can either request this
   * on their own behalf or delete another person from the room
   * if they have permission
   * DELETE /rooms/:roomId/users/:userId
   */
  destroy: [paramLoaders.troupeLoader, function(req, res, next){
    var user = req.resourceTroupeUser;

    return roomService.removeUserFromRoom(req.troupe, user, req.user)
      .then(function() {
        res.send({ success: true });
      })
      .catch(next);
  }],

  // identifier can be an id or a username. id by default
  // e.g /troupes/:id/users/123456
  // e.g /troupes/:id/users/steve?type=username
  load: function(req, identifier, callback) {
    var troupeId = req.params.troupeId;

    if (req.query.type === 'username') {
      var username = identifier;
      return getTroupeUserFromUsername(troupeId, username)
        .nodeify(callback);
    }

    if (mongoUtils.isLikeObjectId(identifier)) {
      var userId = identifier;
      return getTroupeUserFromId(troupeId, userId)
        .nodeify(callback);
    }

    return callback(new StatusError(404));
  }

};
