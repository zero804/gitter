"use strict";

var winston                   = require('../../utils/winston');
var pushNotificationFilter   = require("gitter-web-push-notification-filter");
var nconf                     = require('../../utils/config');
var workerQueue               = require('../../utils/worker-queue-redis');
var userTroupeSettingsService = require('../user-troupe-settings-service');
var pushNotificationGenerator = require('./push-notification-generator');
var debug                     = require('debug')('gitter:push-notification-postbox');
var mongoUtils                = require('../../utils/mongo-utils');
var Q                         = require('q');
var errorReporter             = require('gitter-web-env').errorReporter;

var notificationWindowPeriods = [
  nconf.get("notifications:notificationDelay") * 1000,
  nconf.get("notifications:notificationDelay2") * 1000
];
/* 10 second window for users on mention */
var mentionNotificationWindowPeriod = 10000;

var queue = workerQueue.queue('generate-push-notifications', {}, function() {
  return function(data, done) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var notificationNumber = data.notificationNumber;
    var userNotifySetting = data.userSetting;
    var mentioned = data.mentioned;

    if (!userId || !troupeId || !notificationNumber) return done();

    return pushNotificationGenerator.sendUserTroupeNotification(userId, troupeId, notificationNumber, userNotifySetting, mentioned)
      .catch(function(err) {
        winston.error('Failed to send notifications: ' + err + '. Failing silently.', { exception: err });
        errorReporter(err, { userId: userId, troupeId: troupeId });
      })
      .nodeify(done);
  };
});


function queueNotificationsForChatWithMention(troupeId, chatId, userIds) {
  var chatTime = mongoUtils.getTimestampFromObjectId(chatId);

  return userTroupeSettingsService.getUserTroupeSettingsForUsersInTroupe(troupeId, 'notifications', userIds)
    .then(function(settings) {
      userIds.forEach(function(userId) {
        var notificationSettings = settings[userId];
        var pushNotificationSetting = notificationSettings && notificationSettings.push || 'all';

        /* Mute, then don't continue */
        if (pushNotificationSetting === 'mute') {
          return;
        }

        console.log('TODO: deal with notifications!')
        console.log('TODO: cancel any pending non-mention notifications!')
      });
    });
}

function queueNotificationsForChatWithoutMention(troupeId, chatId, userIds) {
  var chatTime = mongoUtils.getTimestampFromObjectId(chatId);
  debug('queueNotificationsForChatWithoutMention');
  return userTroupeSettingsService.getUserTroupeSettingsForUsersInTroupe(troupeId, 'notifications', userIds)
    .then(function(settings) {
      return Q.all(userIds.map(function(userId) {
        var notificationSettings = settings[userId];
        var pushNotificationSetting = notificationSettings && notificationSettings.push || 'all';


        /* Mute, then don't continue */
        if (pushNotificationSetting === 'mute' || pushNotificationSetting === 'mention') {
          return;
        }

        return pushNotificationFilter.canLockForNotification(userId, troupeId, chatTime)
          .then(function(notificationNumber) {
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
              userId: userId,
              troupeId: troupeId,
              notificationNumber: notificationNumber,
              userSetting: pushNotificationSetting // TODO: remove
            }, { delay: delay });

          });
      }));
    })
    .then(function() {
      debug('queueNotificationsForChatWithoutMention complete');
    })
    .catch(function(err) {
      winston.error('Unable to queue notification: ' + err, { exception: err });
      throw err;
    });
}

exports.queueNotificationsForChat = function(troupeId, chatId, userIds, mentioned) {
  if (mentioned) {
    return queueNotificationsForChatWithMention(troupeId, chatId, userIds);
  } else {
    return queueNotificationsForChatWithoutMention(troupeId, chatId, userIds);
  }
};
