/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston                   = require('../../utils/winston');
var pushNotificationService   = require("../push-notification-service");
var nconf                     = require('../../utils/config');
var workerQueue               = require('../../utils/worker-queue');
var userTroupeSettingsService = require('../user-troupe-settings-service');
var pushNotificationGenerator = require('./push-notification-generator');
var notificationWindowPeriods = [
  nconf.get("notifications:notificationDelay") * 1000,
  nconf.get("notifications:notificationDelay2") * 1000
];
/* 10 second window for users on mention */
var mentionNotificationWindowPeriod = 10000;

var queue = workerQueue.queue('generate-push-notifications', {}, function() {
  return function(data, done) {
    pushNotificationGenerator.sendUserTroupeNotification(data.userTroupe, data.notificationNumber, data.userSetting, done);
  };
});

/*
 * Returns nothing and has no callback. Post your usertroupes and walk away. No guarantee of delivery.
 */
exports.postUserTroupes = function(userTroupes) {
  userTroupeSettingsService.getMultiUserTroupeSettings(userTroupes, 'notifications')
    .then(function(userTroupeNotificationSettings) {
      userTroupes.forEach(function(userTroupe) {
        var userId = userTroupe.userId;
        var troupeId = userTroupe.troupeId;

        var notificationSettings = userTroupeNotificationSettings[userId + ':' + troupeId];
        var pushNotificationSetting = notificationSettings && notificationSettings.push || 'all';

        /* Mute, then don't continue */
        if(pushNotificationSetting === 'mute') {
          winston.verbose('User troupe is muted. Skipping notification');
          return;
        }
        

        pushNotificationService.canLockForNotification(userId, troupeId, userTroupe.startTime, function(err, notificationNumber) {
          if(err) return winston.error('Error while executing canLockForNotification: ' + err, { exception: err });

          if(!notificationNumber) {
            winston.verbose('User troupe already has notification queued. Skipping');
            return;
          }

          var delay;
          if(pushNotificationSetting === 'mention') {
            delay = mentionNotificationWindowPeriod;
          } else {
            delay = notificationWindowPeriods[notificationNumber - 1];
            if(!delay) {
              winston.verbose("User has already gotten two notifications, that's enough. Skipping");
              return;
            }
          }



          winston.verbose('Queuing notification ' + notificationNumber + ' to be send to user ' + userId + ' in ' + delay + 'ms');

          queue.invoke({
            userTroupe: userTroupe,
            notificationNumber: notificationNumber,
            userSetting: pushNotificationSetting
          }, { delay: delay });

        });

      });

    })
    .fail(function(err) {
      winston.error('Unable to queue usertroupes for notification: ' + err, { exception: err });
    });
};

