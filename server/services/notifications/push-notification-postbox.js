/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston                   = require('../../utils/winston');
var pushNotificationService   = require("../push-notification-service");
var nconf                     = require('../../utils/config');
var workerQueue               = require('../../utils/worker-queue');
var userTroupeSettingsService = require('../user-troupe-settings-service');
var pushNotificationGenerator = require('./push-notification-generator');
var debug                     = require('debug')('gitter:push-notification-postbox');

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

function queueNotificationsForChatWithMention(troupeId, chatId, userIds) {

}

function queueNotificationsForChatWithoutMention(troupeId, chatId, userIds) {

  return userTroupeSettingsService.getUserTroupeSettingsForUsersInTroupe(troupeId, 'notifications', userIds)
    .then(function(settings) {
      userIds.forEach(function(userId) {

        var notificationSettings = settings[userId];
        var pushNotificationSetting = notificationSettings && notificationSettings.push || 'all';

        /* Mute, then don't continue */
        if (pushNotificationSetting === 'mute' || pushNotificationSetting === 'mention') {
          return;
        }

        pushNotificationService.canLockForNotification(userId, troupeId, userTroupe.startTime, function(err, notificationNumber) {
          if(err) return winston.error('Error while executing canLockForNotification: ' + err, { exception: err });

          if(!notificationNumber) {
            debug('User troupe already has notification queued. Skipping');
            return;
          }

          var delay = notificationWindowPeriods[notificationNumber - 1];
          if(!delay) {
            debug("User has already gotten two notifications, that's enough. Skipping");
            return;
          }

          debug('Queuing notification %s to be send to user %s in %sms', notificationNumber, userId, delay);

          queue.invoke({
            userTroupe: userTroupe,
            notificationNumber: notificationNumber,
            userSetting: pushNotificationSetting
          }, { delay: delay });

        });
      })
    });
}


exports.queueNotificationsForChat = function(troupeId, chatId, userIds, mentioned) {
  if (mentioned) {
    return queueNotificationsForChatWithMention(troupeId, chatId, userIds);
  } else {
    return queueNotificationsForChatWithoutMention(troupeId, chatId, userIds);
  }


}

/*
 * Returns nothing and has no callback. Post your usertroupes and walk away. No guarantee of delivery.
 */
exports.postUserTroupes = function(userTroupes) {
  console.log('THIS IS DEPRECATED.....')
  userTroupeSettingsService.getMultiUserTroupeSettings(userTroupes, 'notifications')
    .then(function(userTroupeNotificationSettings) {
      userTroupes.forEach(function(userTroupe) {
        var userId = userTroupe.userId;
        var troupeId = userTroupe.troupeId;

        var notificationSettings = userTroupeNotificationSettings[userId + ':' + troupeId];
        var pushNotificationSetting = notificationSettings && notificationSettings.push || 'all';

        /* Mute, then don't continue */
        if(pushNotificationSetting === 'mute') {
          debug('User troupe is muted. Skipping notification');
          return;
        }



      });

    })
    .catch(function(err) {
      winston.error('Unable to queue usertroupes for notification: ' + err, { exception: err });
    });
};
