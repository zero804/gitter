"use strict";

var winston                   = require('../../utils/winston');
var pushNotificationFilter    = require("gitter-web-push-notification-filter");
var nconf                     = require('../../utils/config');
var workerQueue               = require('../../utils/worker-queue-redis');
var userTroupeSettingsService = require('../user-troupe-settings-service');
var debug                     = require('debug')('gitter:push-notification-postbox');
var mongoUtils                = require('../../utils/mongo-utils');
var Promise                   = require('bluebird');
var errorReporter             = require('gitter-web-env').errorReporter;

var notificationWindowPeriods = [
  nconf.get("notifications:notificationDelay") * 1000,
  nconf.get("notifications:notificationDelay2") * 1000
];

/* 10 second window for users on mention */
var mentionNotificationWindowPeriod = 10000;
var maxNotificationsForMentions = 10;
var maxNotificationsForNonMentions = notificationWindowPeriods.length;

// This queue is responsible to taking notifications and deciding which users to forward them on to
var pushNotificationFilterQueue = workerQueue.queue('push-notifications-filter', {}, function() {

  return function(data, done) {
    var troupeId = data.troupeId;
    var chatId = data.chatId;
    var userIds = data.userIds;
    var mentioned = data.mentioned;

    return filterNotificationsForPush(troupeId, chatId, userIds, mentioned)
      .then(function() {
        debug('filterNotificationsForPush complete');
      })
      .catch(function(err) {
        winston.error('Unable to queue notification: ' + err, { exception: err });
      })
      .nodeify(done);
  };
});

// This queue is responsible to generating the actual content of the push notification and sending it to users
var pushNotificationGeneratorQueue = workerQueue.queue('push-notifications-generate', {}, function() {
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
        errorReporter(err, { userId: userId, troupeId: troupeId }, { module: 'push-notification-postbox' });
      })
      .nodeify(done);
  };
});

function filterNotificationsForPush(troupeId, chatId, userIds, mentioned) {
  var chatTime = mongoUtils.getTimestampFromObjectId(chatId);
  debug('filterNotificationsForPush for %s users', userIds.length);

  // TODO: consider asking Redis whether its possible to send to this user BEFORE
  // going to mongo to get notification settings as reversing these two operations
  // may well be much faster
  return userTroupeSettingsService.getUserTroupeSettingsForUsersInTroupe(troupeId, 'notifications', userIds)
    .then(function(settings) {
      return Promise.map(userIds, function(userId) {
        var notificationSettings = settings[userId];
        var pushNotificationSetting = notificationSettings && notificationSettings.push || 'all';

        /* Mute, then don't continue */
        if (pushNotificationSetting === 'mute' || (pushNotificationSetting === 'mention' && !mentioned)) {
          debug('Ignoring push notification for user %s due to push notification setting %s', userId, pushNotificationSetting);
          // Only pushing on mentions and this ain't a mention
          return;
        }

        var maxLocks = mentioned ? maxNotificationsForMentions : maxNotificationsForNonMentions;

        // TODO: bulk version of this method please
        return pushNotificationFilter.canLockForNotification(userId, troupeId, chatTime, maxLocks)
          .then(function(notificationNumber) {
            if(!notificationNumber) {
              // TODO: For mentions: consider cancelling the current lock on mentions and creating a
              // new one as if we're in the 60 second window period, we'll need to
              // wait until the end of the window before sending the mention
              debug('Unable to obtain a lock (max=%s) for user %s in troupe %s. Will not notify', maxLocks, userId, troupeId);
              return;
            }

            var delay;
            if (mentioned) {
              /* Send the notification to the user very shortly */
              delay = mentionNotificationWindowPeriod;
            } else {
              delay = notificationWindowPeriods[notificationNumber - 1];
              if(!delay) {
                debug("Obtained a lock in excess of the maximum lock number of %s", maxLocks);
                return;
              }
            }

            debug('Queuing notification %s to be send to user %s in %sms', notificationNumber, userId, delay);

            return pushNotificationGeneratorQueue.invoke({
              userId: userId,
              troupeId: troupeId,
              notificationNumber: notificationNumber
            }, { delay: delay });

          });
      });
    });
}

exports.queueNotificationsForChat = function(troupeId, chatId, userIds, mentioned) {
  debug('queueNotificationsForChat for %s users', userIds.length);

  return pushNotificationFilterQueue.invoke({
    troupeId: troupeId,
    chatId: chatId,
    userIds: userIds,
    mentioned: mentioned
  });
};

exports.listen = function() {
  pushNotificationGeneratorQueue.listen();
  pushNotificationFilterQueue.listen();
};
