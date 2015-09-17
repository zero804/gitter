/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService        = require("../../../services/troupe-service");
var restful              = require("../../../services/restful");
var restSerializer       = require("../../../serializers/rest-serializer");
var recentRoomService    = require('../../../services/recent-room-service');
var roomMembershipService = require('../../../services/room-membership-service');
var roomService          = require('../../../services/room-service');
var Q                    = require('q');
var mongoUtils           = require('../../../utils/mongo-utils');
var StatusError          = require('statuserror');

module.exports = {
  id: 'userTroupeId',
  index: function(req, res, next) {
    if(!req.user) {
      return next(new StatusError(401));
    }

    return restful.serializeTroupesForUser(req.resourceUser.id)
      .then(function(serialized) {
        res.send(serialized);
      })
      .catch(next);
  },

  update: function(req, res, next) {
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

        if('lurk' in updatedTroupe) {
          if (isMember && !troupe.oneToOne) {
            promises.push(roomService.updateTroupeLurkForUserId(userId, troupeId, updatedTroupe.lurk));
          }
        }

        return Q.all(promises);
      })
      .then(function() {
        var strategy = new restSerializer.TroupeIdStrategy({ currentUserId: userId });

        return restSerializer.serialize(req.params.userTroupeId, strategy);
      })
      .then(function(troupe) {
        res.send(troupe);
      })
      .catch(next);
  },

  /**
   * Hides a room from the menu. A user can only request this
   * on their own behalf.
   *
   * DELETE /users/:userId/rooms/:roomId
   */
  destroy: function(req, res, next) {
    return roomService.hideRoomFromUser(req.params.userTroupeId, req.user._id)
      .then(function() {
        res.send({ success: true });
      })
      .catch(next);
  },

  load: function(req, id, callback) {
    if(!mongoUtils.isLikeObjectId(id)) return callback(new StatusError(400));
    return troupeService.checkIdExists(id)
      .then(function(exists) {
        if (!exists) throw new StatusError(404);
        return id;
      })
      .nodeify(callback);
  },

  subresources: {
    'settings': require('./troupe-settings'),
    'unreadItems': require('./unread-items'),
    'collapsedItems': require('./collapsed-items')
  }
};
