"use strict";

var troupeService = require("../../../services/troupe-service");
var restful = require("../../../services/restful");
var restSerializer = require("../../../serializers/rest-serializer");
var recentRoomService = require('../../../services/recent-room-service');
var userRoomModeUpdateService = require('../../../services/user-room-mode-update-service');
var roomService = require('../../../services/room-service');
var Promise = require('bluebird');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var StatusError = require('statuserror');
var policyFactory = require('gitter-web-permissions/lib/legacy-policy-factory');
var RoomWithPolicyService = require('../../../services/room-with-policy-service');

function performUpdateToUserRoom(req) {
  var userId = req.user.id;
  var troupeId = req.params.userTroupeId;

  return troupeService.findByIdLeanWithMembership(troupeId, req.user && req.user._id)
    .spread(function(troupe, isMember) {

      var updatedTroupe = req.body;

      var promises = [];

      if('favourite' in updatedTroupe) {
        var fav = updatedTroupe.favourite;

        if(!fav || isMember) {
          promises.push(recentRoomService.updateFavourite(userId, troupeId, fav));
        } else {
          // The user has added a favourite that they don't belong to
          // Add them to the room first
          if (!troupe.oneToOne) {
            /* Ignore one-to-one rooms */
            promises.push(
              roomService.findOrCreateRoom(req.resourceUser, troupe.uri)
                .then(function() {
                  return recentRoomService.updateFavourite(userId, troupeId, updatedTroupe.favourite);
                })
              );
          }
        }
      }

      if('updateLastAccess' in updatedTroupe) {
        promises.push(recentRoomService.saveLastVisitedTroupeforUserId(userId, troupeId));
      }

      if('mode' in updatedTroupe) {
        promises.push(userRoomModeUpdateService.setModeForUserInRoom(req.resourceUser, troupeId, updatedTroupe.mode));
      }

      return Promise.all(promises);
    })
    .then(function() {
      var strategy = new restSerializer.TroupeIdStrategy({
        currentUserId: userId,
        includeProviders: true
      });

      return restSerializer.serializeObject(req.params.userTroupeId, strategy);
    });

}

module.exports = {
  id: 'userTroupeId',

  index: function(req) {
    if(!req.user) throw new StatusError(401);

    return restful.serializeTroupesForUser(req.resourceUser.id);
  },

  // Join a room
  create: function(req) {
    var user = req.user;
    if (!user) throw new StatusError(401);
    var source;

    if (typeof req.body.source === 'string') {
      source = req.body.source;
    }

    var troupeId = req.body && req.body.id && "" + req.body.id;
    if(!troupeId || !mongoUtils.isLikeObjectId(troupeId)) throw new StatusError(400);

    return troupeService.findById(troupeService)
      .then(function(room) {
        return [room, policyFactory.createPolicyForRoom(req.user, room)];
      })
      .spread(function(room, policy) {
        var roomWithPolicyService = new RoomWithPolicyService(room, user, policy);

        var options = {
        };

        if (source) {
          options.tracking = { source: source };
        }

        return roomWithPolicyService.joinRoom(options);
      })
      .then(function() {
        var strategy = new restSerializer.TroupeIdStrategy({
          currentUserId: req.user.id,
          includeProviders: true
        });

        return restSerializer.serializeObject(troupeId, strategy);
      });
  },

  update: function(req) {
    // This route is deprecated
    return performUpdateToUserRoom(req);
  },

  patch: function(req) {
    return performUpdateToUserRoom(req);
  },

  /**
   * Hides a room from the menu. A user can only request this
   * on their own behalf.
   *
   * DELETE /users/:userId/rooms/:roomId
   */
  destroy: function(req) {
    return roomService.hideRoomFromUser(req.params.userTroupeId, req.user._id);
  },

  load: function(req, id) {
    if(!mongoUtils.isLikeObjectId(id)) throw new StatusError(400);

    return troupeService.checkIdExists(id)
      .then(function(exists) {
        if (!exists) throw new StatusError(404);

        return id;
      })
      .tap(function(id) {
        return policyFactory.createPolicyForRoomId(req.user, id)
          .then(function(policy) {
            // TODO: middleware?
            req.userRoomPolicy = policy;
          });
      })
  },

  subresources: {
    'settings': require('./troupe-settings'),
    'unreadItems': require('./unread-items'),
    'collapsedItems': require('./collapsed-items')
  }
};
