#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('../server/services/persistence-service');
var roomService = require('../server/services/room-service');
var troupeService = require('../server/services/troupe-service');
var userTroupeSettingsService = require('../server/services/user-troupe-settings-service');
var collections = require('../server/utils/collections');
var shutdown = require('shutdown');

// require('../server/utils/event-listeners').installLocalEventListeners();

var Q = require('q');
var qlimit = require('qlimit');

var limit = qlimit(1);


var opts = require("nomnom")
   .option('room', {
      abbr: 'r',
      required: true,
      help: 'Room URI'
   })
   .option('min', {
      abbr: 'm',
      default: '31',
      help: 'Minimum time in days since last login'
   })
   .option('dryRun', {
     flag: true,
     help: 'Just show the users who will be affected'
   })
   .parse();

var minTimeInDays = parseInt(opts.min, 10);

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

troupeService.findByUri(opts.room)
  .then(function(troupe) {
    var userIds = troupe.getUserIds();

    var lurkStatus = troupe.users.reduce(function(memo, troupeUser) {
      memo[troupeUser.userId] = troupeUser.lurk;
      return memo;
    }, {});

    return [troupe.id, userIds, lurkStatus, getLastAccessTimesForUsersInTroupe(troupe.id, userIds)];
  })
  .spread(function(troupeId, userIds, lurkStatus, results) {
    var cutoff = Date.now() - minTimeInDays * 86400000;

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
      opts.dryRun && persistence.User.findQ({ _id: { $in: oldUserIds }}, { username: 1 }),
      userTroupeSettingsService.getUserTroupeSettingsForUsersInTroupe(troupeId, 'notifications', oldUserIds),
      results
    ];
  })
  .spread(function(troupeId, oldUsersIds, lurkStatus, oldUsers, settings, lastAccessDates) {
    var lurkUserIds = oldUsersIds.filter(function(userId) {
      return !lurkStatus[userId];
    });

    var settingsUserIds = oldUsersIds.filter(function(userId) {
      var notificationSettings = settings[userId];
      var push = notificationSettings && notificationSettings.push;

      return push !== 'mute' && push !== 'mention';
    });

    if (opts.dryRun) {
      var oldUsersIndexed = collections.indexById(oldUsers);
      var mapUsername = function (userId) {
        var user = oldUsersIndexed[userId];
        return user && user.username;
      };

      console.log('old users', oldUsersIds.map(function(userId) {
        var user = oldUsersIndexed[userId];
        return (user && user.username) + ' - ' + new Date(lastAccessDates[userId]).toISOString();
      }).join('\n'));

      console.log('lurk users', lurkUserIds.map(mapUsername).join(', '), '(' + lurkUserIds.length + ')');
      console.log('settings users', settingsUserIds.map(mapUsername).join(', '), '(' + settingsUserIds.length + ')');

      process.exit(0);
    } else {
      console.log('lurk users', lurkUserIds.length);
      console.log('settingsUserIds', settingsUserIds.length);
    }

    return roomService.bulkLurkUsers(troupeId, lurkUserIds)
      .then(function() {
        console.log('Bulk complete');

        return userTroupeSettingsService.setUserSettingsForUsersInTroupe(troupeId, settingsUserIds, 'notifications', { push: 'mention' });
      })
      .then(function() {
        console.log('Done');
      });

  })
  .delay(1000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.log('ERROR IS ', err);
    shutdown.shutdownGracefully(1);
  });
