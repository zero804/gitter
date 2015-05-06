/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restful = require('../../services/restful');
var recentRoomService  = require('../../services/recent-room-service');
var roomService        = require('../../services/room-service');
var emailAddressService = require('../../services/email-address-service');
var userService        = require("../../services/user-service");
var restSerializer     = require("../../serializers/rest-serializer");
var mongoUtils         = require('../../utils/mongo-utils');
var troupeService      = require("../../services/troupe-service");
var StatusError        = require('statuserror');

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

    restful.serializeUsersForTroupe(req.troupe.id, req.user && req.user.id, options)
      .then(function (data) {
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  },

  create: function(req, res, next) {
    var username = req.body.username;
    var troupeId = req.troupe.id;

    // Switch a lean troupe object for a full mongoose object
    return troupeService.findById(troupeId)
      .then(function(troupe) {
        if(!troupe) throw new StatusError(404);

        return roomService.addUserToRoom(troupe, req.user, username);
      })
      .then(function(addedUser) {
        var strategy = new restSerializer.UserStrategy();

        return [
          restSerializer.serializeQ(addedUser, strategy),
          emailAddressService(addedUser)
        ];
      })
      .spread(function(serializedUser, email) {
        if (serializedUser.invited && email) {
          serializedUser.email = maskEmail(email);
        }

        res.send(200, { success: true, user: serializedUser });
      })
      .catch(next);
  },

  destroy: function(req, res, next){
    var user = req.resourceTroupeUser;
    var troupeId = req.troupe.id;

    // Switch a lean troupe object for a full mongoose object
    return troupeService.findById(troupeId)
      .then(function(troupe) {
        if(!troupe) throw new StatusError(404);

        return roomService.removeUserFromRoom(troupe, user, req.user);
      })
      .then(function() {
        recentRoomService.removeRecentRoomForUser(user.id, troupeId);
      })
      .then(function() {
        res.send({ success: true });
      })
      .catch(next);
  },

  // identifier can be an id or a username. id by default
  // e.g /troupes/:id/users/123456
  // e.g /troupes/:id/users/steve?type=username
  load: function(req, identifier, callback) {
    var troupeId = req.troupe.id;

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

    // calls back undefined to throw a 404
    return callback();
  }

};
