"use strict";

var env                       = require('gitter-web-env');
var stats                     = env.stats;
var recentRoomService         = require('./recent-room-service');
var persistence               = require('./persistence-service');
var unreadItemService         = require('./unread-item-service');
var Q                         = require('q');
var qlimit                    = require('qlimit');
var persistence               = require('./persistence-service');
var mongoUtils                = require('../utils/mongo-utils');
var roomMembershipService     = require('./room-membership-service');

/**
 * Returns a list of users who could be lurked
 * [{ userId: ..., lastAccessTime: ..., lurk: ..., notificationSettings: ... }]
 */
function findRemovalCandidates(roomId, options) {
  var minTimeInDays = (options.minTimeInDays || 14);

  return roomMembershipService.findMembersForRoom(roomId)
    .then(function(userIds) {
      return recentRoomService.findLastAccessTimesForUsersInRoom(roomId, userIds);
    })
    .then(function(lastAccessDates) {
      var cutoff = Date.now() - minTimeInDays * 86400000;
      var oldUserIds = Object.keys(lastAccessDates).map(function(userId) {
          var lastAccess = lastAccessDates[userId];

          if (lastAccess && lastAccess < cutoff) {
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
  console.log('Removing ', userIds.length, ' users from ', roomId);
  return roomMembershipService.removeRoomMembers(roomId, userIds)
    .then(function() {
      console.log('Marking items as read');
      return Q.all(userIds.map(bulkUnreadItemLimit(function(userId) {
        return unreadItemService.ensureAllItemsRead(userId, roomId);
      })));
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
