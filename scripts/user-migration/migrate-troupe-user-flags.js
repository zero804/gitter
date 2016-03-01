#!/usr/bin/env node
/* jshint node:true, unused:true */
'use strict';

var persistence = require('../../server/services/persistence-service');
var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var collections = require('../../server/utils/collections');
var roomMembershipFlags = require('../../server/services/room-membership-flags');
var onMongoConnect = require('../../server/utils/on-mongo-connect');
var through2Concurrent = require('through2-concurrent');
var BatchStream = require('batch-stream');
var _ = require('lodash');
var Promise = require('bluebird');

function preloadUserTroupeSettings() {
  console.log('## Preloading usertroupesettings');
  return new Promise(function(resolve, reject) {
    var settings = {};
    var count = 0;
    return persistence.UserTroupeSettings.find({}, { userId: 1, troupeId: 1, 'settings.notifications.push': 1, _id: 0 })
      .lean()
      .read('secondary')
      .stream()
      .on('error', reject)
      .on('end', function() {
        resolve(settings);
      })
      .on('data', function(setting) {
        var userId = setting.userId;
        var troupeId = setting.troupeId;
        var value = setting.settings && setting.settings.notifications && setting.settings.notifications.push;

        if (userId && troupeId && value) {
          settings[userId + ":" + troupeId] = value;
        }

        count++;
        if (count % 1000 === 0) {
          console.log('## Loaded ', count, 'UserTroupe settings');
        }
      });

  });
}

function getModeFromLurkAndSettings(lurk, notificationSetting) {
  switch(notificationSetting || "none") {
    case "all":
      if (lurk) {
        return { mode: "mention", warning: 1 };
      } else {
        return { mode: "all" };
      }
      break;

    case "mention":
    case "announcement":
      if (lurk) {
        return { mode: "mention" };
      } else {
        return { mode: "mention", warning: 2 }; // Add a warning!
      }
      break;

    case "mute":
      if (lurk) {
        return { mode: "mute" };
      } else {
        return { mode: "mute", warning: 3 }; // Add a warning!
      }

      break;

    case "none":
      if (lurk) {
        return { mode: "mention" };
      } else {
        return { mode: "all" };
      }
      break;

    default:
      // Add a warning
      if (lurk) {
        return { mode: "mention", warning: "Unknown setting " + JSON.stringify(notificationSetting) + " (lurk=1) "};
      } else {
        return { mode: "all", warning: "Unknown setting " + JSON.stringify(notificationSetting) + " (lurk=0) " };
      }
  }
}

function getModeForTroupeUser(userId, troupeId, flags, lurk, notificationSetting) {
  var calculated = getModeFromLurkAndSettings(lurk, notificationSetting);

  if (flags !== undefined && flags !== null) {
    var currentMode = roomMembershipFlags.getModeFromFlags(flags);
    if (currentMode !== calculated.mode) {
      calculated.mismatch = "Calculated " + calculated.mode + " but set as " + currentMode + " " + JSON.stringify({ lurk: lurk, notificationSetting: notificationSetting, flags: Number(flags).toString(2) });
    }
  }

  return calculated;
}


function updateTroupeUserBatch(troupeUsers, notificationSettings) {
  var updates = _.map(troupeUsers, function(troupeUser) {
    var lurk = troupeUser.lurk;
    var flags = troupeUser.flags;
    var userId = troupeUser.userId;
    var troupeId = troupeUser.troupeId;
    var notificationSetting = notificationSettings[userId + ":" + troupeId];

    return {
      _id: troupeUser._id,
      userId: troupeUser.userId,
      troupeId: troupeUser.troupeId,
      update: getModeForTroupeUser(userId, troupeId, flags, lurk, notificationSetting)
    };
  });

  return updates;
}

function getTroupeUsersBatchedStream() {
  return persistence.TroupeUser
    .find({})
    .slaveOk()
    .read('secondary')
    .stream()
    .pipe(new BatchStream({ size: 4096 }));
}

function migrateTroupeUsers(notificationSettings) {
  return new Promise(function(resolve, reject) {
    var count = 0;
    getTroupeUsersBatchedStream()
      .pipe(through2Concurrent.obj({ maxConcurrency: 10 }, function(troupeUsers, enc, callback) {
        console.log('## Updating batch');

        count += troupeUsers.length;
        updateTroupeUserBatch(troupeUsers, notificationSettings);
        callback();
      }))
      .on('end', function() {
        resolve();
      })
      .on('error', reject)
      .on('data', function() {});
  });
}

function displayWarningsForUpdates(warnings) {
  if (!warnings.length) return Promise.resolve();

  var uniqueUserIds = _(warnings)
    .map(function(f) { return "" + f.userId; })
    .uniq()
    .value();

  var uniqueTroupeIds = _(warnings)
    .map(function(f) { return "" + f.troupeId; })
    .uniq()
    .value();

  return Promise.join(
    userService.findByIdsLean(uniqueUserIds, { username: 1 }),
    troupeService.findByIdsLean(uniqueTroupeIds, { uri: 1 }),
    function(users, troupes) {
      var usersHashed = collections.indexById(users);
      var troupesHashed = collections.indexById(troupes);

      _.each(warnings, function(warning) {
        var user = usersHashed[warning.userId];
        var troupe = troupesHashed[warning.troupeId];
        console.log(user && user.username, troupe && troupe.uri, warning.update);
      });
    });
}

function dryrunTroupeUsers(notificationSettings) {
  return new Promise(function(resolve, reject) {
    getTroupeUsersBatchedStream()
      .pipe(through2Concurrent.obj({ maxConcurrency: 1 }, function(troupeUsers, enc, callback) {
        var updates = updateTroupeUserBatch(troupeUsers, notificationSettings);
        var warnings = _.filter(updates, function(f) { return f.update.mismatch || f.update.warning; });
        return displayWarningsForUpdates(warnings)
          .asCallback(callback);
      }))
      .on('end', function() {
        resolve();
      })
      .on('error', reject)
      .on('data', function() {});
  });
}

function performMigration() {
  return preloadUserTroupeSettings()
    .then(migrateTroupeUsers);
}

function performDryRun() {
  return preloadUserTroupeSettings()
    .then(dryrunTroupeUsers);
}


var opts = require("nomnom")
  .option('execute', {
    flag: true,
    help: 'Do not perform a dry-run.'
  })
  .parse();

onMongoConnect()
  .then(function() {
    if (opts.execute) {
      return performMigration();
    } else {
      return performDryRun();
    }
  })
  .delay(1000)
  .then(function() {
    process.exit();
  })
  .catch(function(err) {
    console.error(err.stack);
    process.exit(1);
  })
  .done();
