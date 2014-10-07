/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston                   = require('../../utils/winston');
var pushNotificationService   = require("../push-notification-service");
var userService               = require("../user-service");
var nconf                     = require('../../utils/config');
var pushNotificationGateway = require("../../gateways/push-notification-gateway");
var serializer = require("../../serializers/notification-serializer");
var notificationMessageGenerator = require('../../utils/notification-message-generator');
var unreadItemService = require('../unread-item-service');
var Q = require('q');
var basePath = nconf.get('web:basepath');

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

function serializeItems(troupeId, recipientUserId, items, callback) {
  var itemTypes = Object.keys(items);

  var TroupeStrategy = serializer.getStrategy("troupeId");
  var troupeStrategy = new TroupeStrategy({ recipientUserId: recipientUserId });

  var promises = [];
  promises.push(serializer.serializeQ(troupeId, troupeStrategy));

  itemTypes.forEach(function(itemType) {
    var itemIds = items[itemType];

    var Strategy = serializer.getStrategy(itemType + "Id");

    if(Strategy) {
      var strategy = new Strategy({ includeTroupe: false, recipientUserId: recipientUserId });
      promises.push(serializer.serializeQ(itemIds, strategy));
    }
  });

  return Q.all(promises).then(function(results) {
    var troupe = results[0];
    var serializedItems = {};

    itemTypes.forEach(function(itemType,i ) {
      serializedItems[itemType] = results[i + 1];
    });

    return { troupe: troupe, serializedItems: serializedItems };

  }).nodeify(callback);
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

      serializeItems(troupeId, userId, unreadItems, function(err, serialized) {
        if(err) return callback(err);

        var troupe = serialized.troupe;
        var items = serialized.serializedItems;

        if(userSetting == 'mention') {
          items = filterUnreadItemsForUserByMention(user, items);
          // Still want to notify the user?
          if(!items.chat || !items.chat.length) return callback();
        }

        var notificationLink = '/mobile/chat#' + troupe.id;
        var smsLink = basePath + troupe.url;

        var message = notificationMessageGenerator.generateNotificationMessage(troupe, items, smsLink);

        pushNotificationGateway.sendUserNotification(userId, {
            message: message.notificationText,
            smsText: message.smsText,
            sound: notificationNumber == 1 ? 'notify.caf' : 'notify-2.caf',
            link: notificationLink,
            roomId: troupe.id
          }, callback);

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

module.exports.sendUserTroupeNotification = sendUserTroupeNotification;

