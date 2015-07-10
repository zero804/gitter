"use strict";
var env                       = require('gitter-web-env');
var stats                     = env.stats;
var recentRoomService         = require('./recent-room-service');
var persistence               = require('./persistence-service');
var unreadItemService         = require('./unread-item-service');
var troupeService             = require('./troupe-service');
var Q                         = require('q');
var qlimit                    = require('qlimit');
var persistence               = require('./persistence-service');
var mongoUtils                = require('../utils/mongo-utils');
var liveCollectionEvents      = require('./live-collection-events');

/**
 * Returns a list of users who could be lurked
 * [{ userId: ..., lastAccessTime: ..., lurk: ..., notificationSettings: ... }]
 */
function findRemovalCandidates(roomId, options) {
  var minTimeInDays = (options.minTimeInDays || 14);

  return troupeService.findUserIdsForTroupe(roomId)
    .then(function(userIds) {
      return recentRoomService.findLastAccessTimesForUsersInRoom(roomId, userIds)
    })
    .then(function(lastAccessDates) {
      var cutoff = Date.now() - minTimeInDays * 86400000;
      var oldUserIds = Object.keys(lastAccessDates).map(function(userId) {
          var lastAccess = lastAccessDates[userId];

          if (!lastAccess || lastAccess < cutoff) {
            return userId;
          }
        }).filter(function(f) {
          return !!f;
        });

      return [
        oldUserIds,
        lastAccessDates
      ];
    })
    .spread(function(oldUsersIds, lastAccessDates) {
      return oldUsersIds
        .map(function(userId) {
          return {
            userId: userId,
            lastAccessTime: lastAccessDates[userId]
          };
        });
    });
}
exports.findRemovalCandidates = findRemovalCandidates;

var bulkUnreadItemLimit = qlimit(5);

function bulkRemoveUsersFromRoom(roomId, userIds) {

  if (!userIds.length) return Q.resolve();

  return persistence.Troupe.updateQ({ _id: mongoUtils.asObjectID(roomId), oneToOne: { $ne: true } }, {
      $pull: {
        users: {
          userId: { $in: mongoUtils.asObjectIDs(userIds) }
        }
      },
      $inc: { userCount: -userIds.length }
    })
    .then(function() {
      // Second attempt at ensuring the room has the right number of people in it
      // NB: not transaction
      return persistence.Troupe.aggregateQ([{
        $match: { _id: mongoUtils.asObjectID(roomId) }
      }, {
        $project: { userCount: { $size: "$users" } }
      }]);
    })
    .then(function(x) {
      var userCount = x && x[0] && x[0].userCount;
      if (userCount >= 0) {
        return persistence.Troupe.updateQ({ _id: mongoUtils.asObjectID(roomId) }, {
          $set: { userCount: userCount }
        });
      }
    })
    .then(function() {
      return Q.all(userIds.map(bulkUnreadItemLimit(function(userId) {
        return unreadItemService.ensureAllItemsRead(userId, roomId);
      })));
    })
    .then(function() {
      return Q.all(userIds.map(function(userId) {
        return liveCollectionEvents.serializeUserRemovedFromGroupRoom(roomId, userId);
      }));
    })
    .then(function() {
      userIds.forEach(function(userId) {
        stats.event("auto_removed_room", {
          userId: userId,
          troupeId: roomId,
          auto: true
        });
      });
    });
}
exports.bulkRemoveUsersFromRoom = bulkRemoveUsersFromRoom;


/**
 * Auto remove users in a room
 */
function autoRemoveInactiveUsers(roomId, options) {
  return findRemovalCandidates(roomId, options)
    .then(function(candidates) {
      if (!candidates.length) return [];

      var usersToLurk = candidates
        .map(function(candidate) {
          return candidate.userId;
        });

      return bulkRemoveUsersFromRoom(roomId, usersToLurk)
        .thenResolve(candidates);
    });
}
exports.autoRemoveInactiveUsers = autoRemoveInactiveUsers;
