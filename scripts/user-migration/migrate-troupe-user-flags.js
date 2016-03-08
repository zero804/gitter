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
      .read('secondaryPreferred')
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

// function getModeFromLurkAndSettings(lurk, notificationSetting) {
//   switch(notificationSetting || "none") {
//     case "all":
//       if (lurk) {
//         return { mode: "mention", warning: 1 };
//       } else {
//         return { mode: "all" };
//       }
//       break;
//
//     case "mention":
//     case "announcement":
//       if (lurk) {
//         return { mode: "mention" };
//       } else {
//         return { mode: "mention", warning: 2 }; // Add a warning!
//       }
//       break;
//
//     case "mute":
//       if (lurk) {
//         return { mode: "mute" };
//       } else {
//         return { mode: "mute", warning: 3 }; // Add a warning!
//       }
//
//       break;
//
//     case "none":
//       if (lurk) {
//         return { mode: "mention" };
//       } else {
//         return { mode: "all", isDefault: true };
//       }
//       break;
//
//     default:
//       // Add a warning
//       if (lurk) {
//         return { mode: "mention", warning: 4, warningMessage: "Unknown setting " + JSON.stringify(notificationSetting) + " (lurk=1) "};
//       } else {
//         return { mode: "all", warning: 4, warningMessage: "Unknown setting " + JSON.stringify(notificationSetting) + " (lurk=0) " };
//       }
//   }
// }
//
// function getModeForTroupeUser(userId, troupeId, flags, lurk, notificationSetting) {
//   var calculated = getModeFromLurkAndSettings(lurk, notificationSetting);
//
//   if (flags !== undefined && flags !== null) {
//     var currentMode = roomMembershipFlags.getModeFromFlags(flags);
//     if (currentMode !== calculated.mode) {
//       calculated.mismatch = "Calculated " + calculated.mode + " but set as " + currentMode + " " + JSON.stringify({ lurk: lurk, notificationSetting: notificationSetting, flags: Number(flags).toString(2) });
//     }
//   }
//
//   return calculated;
// }

function getFlagsForSettings(settings, lurk) {
  lurk = !!lurk;
  var flags, flagsWithLurk;
  var warning;
  var defaultValue;

  switch(settings || "none") {
    case "all":
      flags = roomMembershipFlags.getFlagsForMode("all", false);
      flagsWithLurk = roomMembershipFlags.toggleLegacyLurkMode(flags, lurk);

      if (flagsWithLurk !== flags) {
        warning = lurk ? "all_with_lurk" : "unhandled_case_1";
      }

      defaultValue = false;
      break;

    case "announcement":
    case "mention":
      flags = roomMembershipFlags.getFlagsForMode(settings, false);
      flagsWithLurk = roomMembershipFlags.toggleLegacyLurkMode(flags, lurk);

      if (flagsWithLurk !== flags) {
        warning = lurk ? "unhandled_case_2" : "mention_with_unread";
      }

      defaultValue = false;
      break;

    case "mute":
      flags = roomMembershipFlags.getFlagsForMode(settings, false);
      flagsWithLurk = roomMembershipFlags.toggleLegacyLurkMode(flags, lurk);

      if (flagsWithLurk !== flags) {
        warning = lurk ? "unhandled_case_3" : "mute_with_unread";
      }

      defaultValue = false;
      break;

    case "none":
      if (lurk) {
        flagsWithLurk = flags = roomMembershipFlags.getFlagsForMode("announcement", false);
      } else {
        flagsWithLurk = flags = roomMembershipFlags.getFlagsForMode("all", true);
        defaultValue = true;
      }
      break;

    default:
      if (lurk) {
        flags = roomMembershipFlags.getFlagsForMode("announcement", false);
        warning = "unknown_with_lurk";
      } else {
        flags = roomMembershipFlags.getFlagsForMode("all", true);
        warning = "unknown_without_lurk";
      }
      break;
  }

  return {
    lurk: lurk,
    isDefault: defaultValue,
    flags: flagsWithLurk,
    warning: warning
  };

}
function getTroupeUserBatchUpdates(troupeUsers, notificationSettings) {
  var updates = _.map(troupeUsers, function(troupeUser) {
    var lurk = troupeUser.lurk;
    var flags = troupeUser.flags;
    var userId = troupeUser.userId;
    var troupeId = troupeUser.troupeId;
    var notificationSetting = notificationSettings[userId + ":" + troupeId];

    var info = getFlagsForSettings(notificationSetting, lurk);

    return {
      _id: troupeUser._id,
      userId: troupeUser.userId,
      troupeId: troupeUser.troupeId,
      currentFlags: flags,
      newFlags: info.flags,
      lurk: info.lurk,
      warning: info.warning,
      isDefault: info.isDefault
    };
  });

  return updates;
}

function getTroupeUsersBatchedStream() {
  return persistence.TroupeUser
    .find({ $or: [{
      flags: { $exists: false }
    }, {
      flags: null
    }, {
      flags: 0
    }]})
    .read('secondaryPreferred')
    .stream()
    .pipe(new BatchStream({ size: 4096 }));
}

var bulkUpdate = Promise.method(function (updates) {
  if (!updates || !updates.length) return;

  var bulk = persistence.TroupeUser.collection.initializeUnorderedBulkOp();

  updates.forEach(function(update) {
    bulk.find({ _id: update._id, $or: [{
      flags: { $exists: false }
    }, {
      flags: null
    }, {
      flags: 0
    } ] })
    .updateOne({
      $set: {
        flags: update.newFlags,
        lurk: update.lurk
      }
    });
  });

  return Promise.fromCallback(function(callback) {
      bulk.execute(callback);
    })
    .then(function(result) {
      console.log(result.toJSON());
    });

});

function migrateTroupeUsers(notificationSettings) {
  return new Promise(function(resolve, reject) {
    var count = 0;
    getTroupeUsersBatchedStream()
      .pipe(through2Concurrent.obj({ maxConcurrency: 10 }, function(troupeUsers, enc, callback) {
        console.log('## Updating batch');

        count += troupeUsers.length;
        var updates = getTroupeUserBatchUpdates(troupeUsers, notificationSettings);
        return bulkUpdate(updates)
          .asCallback(callback);
      }))
      .on('end', function() {
        resolve();
      })
      .on('error', reject)
      .on('data', function() {});
  });
}

function dryrunTroupeUsers(notificationSettings) {
  var defaultCount = 0;
  var warningCount = 0;
  var warningAggregation = {

  };
  var count = 0;

  return new Promise(function(resolve, reject) {
    getTroupeUsersBatchedStream()
      .pipe(through2Concurrent.obj({ maxConcurrency: 1 }, function(troupeUsers, enc, callback) {

        count += troupeUsers.length;
        console.log('## Processesing batch', count);

        var updates = getTroupeUserBatchUpdates(troupeUsers, notificationSettings);
        _.forEach(updates, function(f) {
          if (f.isDefault) {
            defaultCount++;
          }

          var warning = f.warning;
          if (warning) {
            warningCount++;
            if (!warningAggregation[warning]) {
              warningAggregation[warning] = 1;
            } else {
              warningAggregation[warning]++;
            }
          }
        });
        return callback();
        // return displayWarningsForUpdates(warnings)
        //   .asCallback(callback);
      }))
      .on('end', function() {
        console.log('TroupeUsers on default settings: ' + defaultCount);
        console.log('TroupeUsers with warnings: ' + warningCount);
        console.log('Warning types: ', JSON.stringify(warningAggregation, null, '  '));
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
