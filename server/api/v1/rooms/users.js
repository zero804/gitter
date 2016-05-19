"use strict";

var restful             = require('../../../services/restful');
var roomService         = require('../../../services/room-service');
var emailAddressService = require('../../../services/email-address-service');
var userService         = require("../../../services/user-service");
var restSerializer      = require("../../../serializers/rest-serializer");
var mongoUtils          = require('gitter-web-persistence-utils/lib/mongo-utils');
var troupeService       = require("../../../services/troupe-service");
var StatusError         = require('statuserror');
var Promise             = require('bluebird');
var loadTroupeFromParam = require('./load-troupe-param');

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
  return troupeService.findByIdLeanWithMembership(troupeId, userId)
    .spread(function(troupe, isMember) {
      if (!isMember) return;

      return userService.findById(userId);
    });
}

function getTroupeUserFromUsername(troupeId, username) {
  return userService.findByUsername(username)
    .then(function(user) {
      return troupeService.findByIdLeanWithMembership(troupeId, user.id)
        .spread(function(troupe, isMember) {
          if (!isMember) return;

          return user;
        });
      });
}

module.exports = {
  id: 'resourceTroupeUser',

  index: function(req) {
    var options = {
      lean: !!req.query.lean,
      skip: parseInt(req.query.skip, 10) || undefined,
      limit: parseInt(req.query.limit, 10) || undefined,
      searchTerm: req.query.q
    };

    return restful.serializeUsersForTroupe(req.params.troupeId, req.user && req.user.id, options);
  },

  create: function(req) {
    var policy = req.userRoomPolicy;

    return Promise.join(
      loadTroupeFromParam(req),
      policy.canAddUser(),
      function(troupe, addUserAccess) {
        if (!troupe) throw new StatusError(404);
        if (!addUserAccess) throw new StatusError(403, 'You do not have permission to add people to this room.');
        var username = req.body.username;

        return roomService.addUserToRoom(troupe, req.user, username);
      })
      .then(function(addedUser) {
        var strategy = new restSerializer.UserStrategy();

        return [
          restSerializer.serializeObject(addedUser, strategy),
          emailAddressService(addedUser, { attemptDiscovery: true })
        ];
      })
      .spread(function(serializedUser, email) {
        if (serializedUser.invited && email) {
          serializedUser.email = maskEmail(email);
        }

        return { success: true, user: serializedUser };
      });
  },

  /**
   * Removes a member from a room. A user can either request this
   * on their own behalf or delete another person from the room
   * if they have permission
   * DELETE /rooms/:roomId/users/:userId
   */
  destroy: function(req) {
    var user = req.resourceTroupeUser;
    if (!req.user) throw new StatusError(401);
    var policy = req.userRoomPolicy;

    var policyCheck;
    if (mongoUtils.objectIDsEqual(user._id, req.user._id)) {
      policyCheck = Promise.resolve(true); // You can always remove yourself
    } else {
      policyCheck = policy.canAdmin();
    }

    return Promise.join(
      loadTroupeFromParam(req),
      policyCheck,
      function(troupe, hasAccess) {
        if (!hasAccess) throw new StatusError(403);

        return roomService.removeUserFromRoom(troupe, user);
      })
      .then(function() {
        return { success: true };
      });
  },

  // identifier can be an id or a username. id by default
  // e.g /troupes/:id/users/123456
  // e.g /troupes/:id/users/steve?type=username
  load: function(req, identifier) {
    var troupeId = req.params.troupeId;

    if (req.query.type === 'username') {
      var username = identifier;
      return getTroupeUserFromUsername(troupeId, username);
    }

    if (mongoUtils.isLikeObjectId(identifier)) {
      var userId = identifier;
      return getTroupeUserFromId(troupeId, userId);
    }

    throw new StatusError(404);
  }

};
