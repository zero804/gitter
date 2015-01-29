#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('../server/services/persistence-service');
var roomService = require('../server/services/room-service');
var userTroupeSettingsService = require('../server/services/user-troupe-settings-service');
var collections = require('../server/utils/collections');
var shutdown = require('shutdown');

require('../server/utils/event-listeners').installLocalEventListeners();

var Q = require('q');
var qlimit = require('qlimit');

var limit = qlimit(1);

var lurkUserInTroupe = limit(function (username, userId, troupeId, updateNotificationSettings, updateLurk) {
  console.log('\nUpdating ', username);

  return Q.all([
      updateNotificationSettings && userTroupeSettingsService.setUserSettings(userId, troupeId, 'notifications', { push: 'mention' }),
      updateLurk && roomService.updateTroupeLurkForUserId(userId, troupeId, true)
    ])
    .delay(1000);
});

function getLastAccessTimesForUsersInTroupe(troupeId, userIds) {
  return persistence.UserTroupeLastAccess.findQ(
     { userId: { $in: userIds } },
     'userId troupes.' + troupeId)
    .then(function(results) {
      return results.reduce(function(memo, result) {
        memo[result.userId] = result.troupes && result.troupes[troupeId];
        return memo;
      }, {});
    });
}

persistence.Troupe.findOneQ({ lcUri: 'marionettejs/backbone.marionette' })
  .then(function(troupe) {
    var userIds = troupe.getUserIds();

    var lurkStatus = troupe.users.reduce(function(memo, troupeUser) {
      memo[troupeUser.userId] = troupeUser.lurk;
      return memo;
    }, {});

    return [troupe.id, userIds, lurkStatus, getLastAccessTimesForUsersInTroupe(troupe.id, userIds)];
  })
  .spread(function(troupeId, userIds, lurkStatus, results) {
    var cutoff = Date.now() - 31 * 86400000;

    var oldUserIds = Object.keys(results).map(function(userId) {
        var lastAccess = results[userId];

        if (lastAccess && lastAccess < cutoff) {
          return userId;
        }
      }).filter(function(f) {
        return !!f;
      });

    return [
      troupeId,
      oldUserIds,
      lurkStatus,
      persistence.User.findQ({ _id: { $in: oldUserIds }}),
      userTroupeSettingsService.getUserTroupeSettingsForUsersInTroupe(troupeId, 'notifications', oldUserIds)
    ];
  })
  .spread(function(troupeId, oldUsersIds, lurkStatus, oldUsers, settings) {
    var oldUsersIndexed = collections.indexById(oldUsers);

    return Q.all(oldUsersIds.map(function(userId) {
      var user = oldUsersIndexed[userId];
      var notificationSettings = settings[userId];
      var push = notificationSettings && notificationSettings.push;

      var updateNotificationSettings = push !== 'mute' && push !== 'mention';
      var updateLurk = !lurkStatus[userId];

      console.log(user && user.username || userId, push, lurkStatus[userId]);

      if (!updateNotificationSettings && !updateLurk) return; // Skip this user....

      return lurkUserInTroupe(user && user.username || userId, userId, troupeId, updateNotificationSettings, updateLurk);
    }));

  })
  .delay(10000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.log('ERROR IS ', err);
    shutdown.shutdownGracefully(1);
  });
