/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston                   = require("winston");
var pushNotificationService   = require("../push-notification-service");
var userService               = require("../user-service");
var nconf                     = require('../../utils/config');
var workerQueue               = require('../../utils/worker-queue');
var userTroupeSettingsService = require('../user-troupe-settings-service');
var notificationWindowPeriods = [
  nconf.get("notifications:notificationDelay") * 1000,
  nconf.get("notifications:notificationDelay2") * 1000
];
/* 10 second window for users on mention */
var mentionNotificationWindowPeriod = 10000;

function filterUnreadItemsForUserByMention(user, items) {
  var username = user.username;
  var displayName = user.displayName;

  return {
    // Mentions: ignore all non-chat items
    chat: items.chat.filter(function(chat) {
      if(!chat.mentions || !chat.mentions.length) return;

      return chat.mentions.some(function(mention) {
        var re = new RegExp(mention.screenName, 'i');

        return username && username.match(re) ||
                displayName && displayName.match(re);
      });

    })
  };
}
var queue = workerQueue.queue('generate-push-notifications', {}, function() {
  var pushNotificationGateway = require("../../gateways/push-notification-gateway");
  var serializer = require("../../serializers/notification-serializer");
  var notificationMessageGenerator = require('../../utils/notification-message-generator');
  var unreadItemService = require('./../unread-item-service');
  var Fiber = require('../../utils/fiber');
  var basePath = nconf.get('web:basepath');

  function serializeItems(troupeId, recipientUserId, items, callback) {
    winston.verbose('serializeItems:', items);

    var itemTypes = Object.keys(items);

    var f = new Fiber();

    var TroupeStrategy = serializer.getStrategy("troupeId");
    var troupeStrategy = new TroupeStrategy({ recipientUserId: recipientUserId });

    serializer.serialize(troupeId, troupeStrategy, f.waitor());

    itemTypes.forEach(function(itemType) {
      var itemIds = items[itemType];

      var Strategy = serializer.getStrategy(itemType + "Id");

      if(Strategy) {
        var strategy = new Strategy({ includeTroupe: false, recipientUserId: recipientUserId });
        serializer.serialize(itemIds, strategy, f.waitor());
      }

    });

    f.all().then(function(results) {
      var troupe = results[0];
      var serializedItems = {};

      itemTypes.forEach(function(itemType,i ) {
        serializedItems[itemType] = results[i + 1];
      });

      callback(null, troupe, serializedItems);
    }, callback);
  }

  function notifyUserOfActivitySince(userId, troupeId, since, notificationNumber, userSetting, callback) {
    winston.verbose('notifyUserOfActivitySince: ', { userId: userId, troupeId: troupeId, since: new Date(since), number: notificationNumber, userSetting: userSetting });

    userService.findById(userId, function(err, user) {
      if(err) return callback(err);

      unreadItemService.getUnreadItemsForUserTroupeSince(userId, troupeId, since, function(err, unreadItems) {
        if(err) return callback(err);



        if(!Object.keys(unreadItems).length) {
          winston.verbose('User has no unread items since ', { userId: userId, troupeId: troupeId, since: since, notificationNumber: notificationNumber} );
          return callback();
        }

        serializeItems(troupeId, userId, unreadItems, function(err, troupe, items) {
          if(err) return callback(err);

          if(userSetting == 'mention') {
            items = filterUnreadItemsForUserByMention(user, items);
            // Still want to notify the user?
            if(!items.chat || !items.chat.length) return callback();
          }

          var f = new Fiber();

          var notificationLink = '/mobile/chat#' + troupe.id;
          var smsLink = basePath + troupe.url;

          var message = notificationMessageGenerator.generateNotificationMessage(troupe, items, smsLink);

          pushNotificationGateway.sendUserNotification(userId, {
              message: message.notificationText,
              smsText: message.smsText,
              sound: notificationNumber == 1 ? 'notify.caf' : 'notify-2.caf',
              link: notificationLink
            }, f.waitor());

          f.thenCallback(callback);

        });

      });

    });
  }


  function sendUserTroupeNotification(userTroupe, notificationNumber, userSetting, callback) {
    pushNotificationService.canUnlockForNotification(userTroupe.userId, userTroupe.troupeId, notificationNumber, function(err, startTime) {
      if(err) return callback(err);

      if(!startTime) {
        winston.verbose('Unable to obtain lock to notify userTroupe. Skipping');
        return;
      }

      if(userSetting == 'mute') {
        /* Mute this troupe for this user */
        return callback();
      }

      notifyUserOfActivitySince(userTroupe.userId, userTroupe.troupeId, startTime, notificationNumber, userSetting, function(err) {
        if(err) winston.error('Failed to send notifications: ' + err + '. Failing silently.', { exception: err });

        return callback();
      });

    });
  }

  return function(data, done) {
    sendUserTroupeNotification(data.userTroupe, data.notificationNumber, data.userSetting, done);
  };

});


exports.queueUserTroupesForNotification = function(userTroupes) {
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
              // User had already gotten two notifications, that's enough
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
      winston.error('Unable to queueUserTroupesForNotification: ' + err, { exception: err });
    });
};

