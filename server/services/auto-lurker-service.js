"use strict";

var recentRoomService = require('./recent-room-service');
var userTroupeSettingsService = require('./user-troupe-settings-service');

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
