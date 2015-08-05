"use strict";

var winston                   = require('../../utils/winston');
var pushNotificationFilter   = require("gitter-web-push-notification-filter");
var nconf                     = require('../../utils/config');
var workerQueue               = require('../../utils/worker-queue-redis');
var userTroupeSettingsService = require('../user-troupe-settings-service');
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
var maxNotificationsForMentions = 10;

var queue = workerQueue.queue('generate-push-notifications', {}, function() {
  var pushNotificationGenerator = require('./push-notification-generator');

  return function(data, done) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var notificationNumber = data.notificationNumber;

    debug('Spooling push notification for %s in %s, #%s', userId, troupeId, notificationNumber);

    if (!userId || !troupeId || !notificationNumber) return done();

    return pushNotificationGenerator.sendUserTroupeNotification(userId, troupeId, notificationNumber)
      .catch(function(err) {
        winston.error('Failed to send notifications: ' + err + '. Failing silently.', { exception: err });
        errorReporter(err, { userId: userId, troupeId: troupeId });
      })
      .nodeify(done);
  };
});

exports.queueNotificationsForChat = function(troupeId, chatId, userIds, mentioned) {
  var chatTime = mongoUtils.getTimestampFromObjectId(chatId);
  debug('queueNotificationsForChat');

  // TODO: consider asking Redis whether its possible to send to this user BEFORE
  // going to mongo to get notification settings as reversing these two operations
  // may well be much faster
  return userTroupeSettingsService.getUserTroupeSettingsForUsersInTroupe(troupeId, 'notifications', userIds)
    .then(function(settings) {
      return Q.all(userIds.map(function(userId) {
        var notificationSettings = settings[userId];
        var pushNotificationSetting = notificationSettings && notificationSettings.push || 'all';

        /* Mute, then don't continue */
        if (pushNotificationSetting === 'mute') {
          return;
        }

        if (pushNotificationSetting === 'mention' && !mentioned) {
          // Only pushing on mentions and this ain't a mention
          return;
        }

        // TODO: bulk version of this method please
        return pushNotificationFilter.canLockForNotification(userId, troupeId, chatTime)
          .then(function(notificationNumber) {
            if(!notificationNumber) {
              // TODO: consider cancelling the current lock on mentions and creating a
              // new one as if we're in the 60 second window period, we'll need to
              // wait until the end of the window before sending the mention
              debug('User troupe already has notification queued. Skipping');
              return;
            }

            var delay;
            if (mentioned) {
              if (notificationNumber > maxNotificationsForMentions) {
                debug("User has receieved too many mention push notifications");
                return;
              }

              /* Send the notification to the user very shortly */
              delay = mentionNotificationWindowPeriod;
            } else {
              delay = notificationWindowPeriods[notificationNumber - 1];
              if(!delay) {
                debug("User has already gotten two notifications, that's enough. Skipping");
                return;
              }
            }

            debug('Queuing notification %s to be send to user %s in %sms', notificationNumber, userId, delay);

            queue.invoke({
              userId: userId,
              troupeId: troupeId,
              notificationNumber: notificationNumber
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
};

exports.listen = function() {
  queue.listen();
};
