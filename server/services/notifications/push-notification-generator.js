/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston                      = require('../../utils/winston');
var pushNotificationFilter       = require("gitter-web-push-notification-filter");
var pushNotificationGateway      = require("../../gateways/push-notification-gateway");
var serializer                   = require("../../serializers/notification-serializer");
var notificationMessageGenerator = require('./notification-message-generator');
var unreadItemService            = require('../unread-item-service');
var Q                            = require('q');

function serializeItems(troupeId, recipientUserId, chatIds) {
  var troupeStrategy = new serializer.TroupeIdStrategy({ recipientUserId: recipientUserId });
  var chatStrategy = new serializer.ChatIdStrategy({ includeTroupe: false, recipientUserId: recipientUserId });

  return Q.all([
    serializer.serializeQ(troupeId, troupeStrategy),
    serializer.serializeQ(chatIds, chatStrategy),
  ]);
}

function notifyUserOfActivitySince(userId, troupeId, since, notificationNumber, userSetting) {
  winston.verbose('notifyUserOfActivitySince: ', { userId: userId, troupeId: troupeId, since: since, number: notificationNumber, userSetting: userSetting });

  return unreadItemService.getUnreadItemsForUserTroupeSince(userId, troupeId, since)
    .then(function(unreadItems) {

      if (!unreadItems.chat || !unreadItems.chat.length) {
        winston.verbose('User has no unread items since ', { userId: userId, troupeId: troupeId, since: since, notificationNumber: notificationNumber} );
        return;
      }

      return serializeItems(troupeId, userId, unreadItems.chat)
        .spread(function(troupe, chats) {
          if (!troupe || !chats || !chats.length) return;

          // TODO: this is horrible!
          // if(userSetting == 'mention') {
          //   items = filterUnreadItemsForUserByMention(userId, items);
          //   // Still want to notify the user?
          //   if(!items.chat || !items.chat.length) return callback();
          // }

          var notificationLink = '/mobile/chat#' + troupe.id;

          var message = notificationMessageGenerator(troupe, chats);
          return pushNotificationGateway.sendUserNotification(userId, {
            roomId: troupe.id,
            roomName: troupe.name || troupe.uri,
            message: message,
            sound: notificationNumber == 1 ? 'notify.caf' : 'notify-2.caf',
            link: notificationLink
          });
        });

  });

}

function sendUserTroupeNotification(userId, troupeId, notificationNumber, userNotifySetting, mentioned) {
  return pushNotificationFilter.canUnlockForNotification(userId, troupeId, notificationNumber)
    .then(function(startTime) {
      if(!startTime) {
        winston.verbose('Unable to obtain lock to notify userTroupe. Skipping');
        return;
      }

      // TODO: remove this....
      if(userNotifySetting == 'mute') {
        /* Mute this troupe for this user */
        return;
      }

      return notifyUserOfActivitySince(userId, troupeId, startTime, notificationNumber, userNotifySetting);
    });
}

module.exports.sendUserTroupeNotification = sendUserTroupeNotification;
