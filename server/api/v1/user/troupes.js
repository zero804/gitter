"use strict";

var troupeService     = require("../../../services/troupe-service");
var restful           = require("../../../services/restful");
var restSerializer    = require("../../../serializers/rest-serializer");
var recentRoomService = require('../../../services/recent-room-service');
var roomMembershipService = require('../../../services/room-membership-service');
var roomService       = require('../../../services/room-service');
var Promise           = require('bluebird');
var mongoUtils        = require('../../../utils/mongo-utils');
var StatusError       = require('statuserror');

function performUpdateToUserRoom(req) {
  var userId = req.user.id;
  var troupeId = req.params.userTroupeId;

  return troupeService.findByIdLeanWithAccess(troupeId, req.user && req.user._id)
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
        promises.push(roomMembershipService.setMembershipMode(userId, troupeId, updatedTroupe.mode, false));
      }

      return Promise.all(promises);
    })
    .then(function() {
      var strategy = new restSerializer.TroupeIdStrategy({ currentUserId: userId });

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
    if(!req.user) throw new StatusError(401);

    var troupeId = req.body && req.body.id && "" + req.body.id;
    if(!troupeId || !mongoUtils.isLikeObjectId(troupeId)) throw new StatusError(400);

    var options = {
      tracking: { source: req.body.source }
    };

    return roomService.joinRoom(troupeId, req.user, options)
      .then(function() {
        var strategy = new restSerializer.TroupeIdStrategy({ currentUserId: req.user.id });

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
      });
  },

  subresources: {
    'settings': require('./troupe-settings'),
    'unreadItems': require('./unread-items'),
    'collapsedItems': require('./collapsed-items')
  }
};
