"use strict";

var recentRoomService         = require('./recent-room-service');
var userTroupeSettingsService = require('./user-troupe-settings-service');
var persistence               = require('./persistence-service');
var unreadItemService         = require('./unread-item-service');
var Q                         = require('q');
var qlimit                    = require('qlimit');

/**
 * Returns a list of users who could be lurked
 * [{ userId: ..., lastAccessTime: ..., lurk: ..., notificationSettings: ... }]
 */
function findLurkCandidates(troupe, options) {
  var userIds = troupe.getUserIds();
  var minTimeInDays = (options.minTimeInDays || 14);

  var lurkStatus = troupe.users.reduce(function(memo, troupeUser) {
    memo[troupeUser.userId] = troupeUser.lurk;
    return memo;
  }, {});

  return recentRoomService.findLastAccessTimesForUsersInRoom(troupe.id, userIds)
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
        userTroupeSettingsService.getUserTroupeSettingsForUsersInTroupe(troupe.id, 'notifications', oldUserIds),
        lastAccessDates
      ];
    })
    .spread(function(oldUsersIds, settings, lastAccessDates) {

      return oldUsersIds
        .filter(function(userId) {
          var notificationSettings = settings[userId];
          var push = notificationSettings && notificationSettings.push;
          var isLurking = lurkStatus[userId];

          return !isLurking || (push !== 'mute' && push !== 'mention');
        })
        .map(function(userId) {
          var notificationSettings = settings[userId];
          var isLurking = lurkStatus[userId];

          return {
            userId: userId,
            notificationSettings: notificationSettings && notificationSettings.push,
            lurk: isLurking,
            lastAccessTime: lastAccessDates[userId]
          };
        });
    });
}

exports.findLurkCandidates = findLurkCandidates;


var bulkUnreadItemLimit = qlimit(5);
/**
 * Bulk lurk users without putting undue strain on mongodb
 */
function bulkLurkUsers(troupeId, userIds) {
  var userHash = userIds.reduce(function(memo, userId) {
    memo[userId] = true;
    return memo;
  }, {});

  return persistence.Troupe.findByIdQ(troupeId)
    .then(function(troupe) {
      troupe.users.forEach(function(troupeUser) {
        if (userHash[troupeUser.userId]) {
          troupeUser.lurk = true;
        }
      });
      troupe._skipTroupeMiddleware = true; // Don't send out an update
      return troupe.saveQ();
    })
    .then(function() {
      return Q.all(userIds.map(bulkUnreadItemLimit(function(userId) {
        return unreadItemService.ensureAllItemsRead(userId, troupeId);
      })));
    });

    // Odd, user not found
    // if(!count) return;

    // Don't send updates for now
    //appEvents.userTroupeLurkModeChange({ userId: userId, troupeId: troupeId, lurk: lurk });
    // TODO: in future get rid of this but this collection is used by the native clients
    //appEvents.dataChange2('/user/' + userId + '/rooms', 'patch', { id: troupeId, lurk: lurk });

    // Delete all the chats in Redis for this person too
}
exports.bulkLurkUsers = bulkLurkUsers;


/**
 * Auto lurk users in a room
 */
function autoLurkInactiveUsers(troupe, options) {
  return findLurkCandidates(troupe, options)
    .then(function(candidates) {
      if (!candidates.length) return [];

      var usersToLurk = candidates
        .filter(function(candidate) {
          return !candidate.lurk;
        })
        .map(function(candidate) {
          return candidate.userId;
        });

      var usersToChangeSettings = candidates
        .filter(function(candidate) {
          return candidate.notificationSettings !== 'mute' && candidate.notificationSettings !== 'mention';
        })
        .map(function(candidate) {
          return candidate.userId;
        });

      return Q.all([
        usersToChangeSettings.length && userTroupeSettingsService.setUserSettingsForUsersInTroupe(troupe.id, usersToChangeSettings, 'notifications', { push: 'mention' }),
        usersToLurk.length && bulkLurkUsers(troupe.id, usersToLurk)
      ]).thenResolve(candidates);
    });
}
exports.autoLurkInactiveUsers = autoLurkInactiveUsers;
