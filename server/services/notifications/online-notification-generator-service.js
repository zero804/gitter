/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q                         = require('q');
var userTroupeSettingsService = require('../user-troupe-settings-service');
var appEvents                 = require('gitter-web-appevents');
var troupeDao                 = require('../daos/troupe-dao').lean;
var userDao                   = require('../daos/user-dao').lean;
var chatService               = require('../chat-service');
var _                         = require('lodash');
var debug                     = require('debug')('gitter:online-notification-generator');

function generateChatMessageNotification(troupeId, chatId) {
  return Q.all([
      chatService.findByIdLean(chatId, { fromUserId: 1, text: 1 }),
      troupeDao.findByIdRequired(troupeId, { uri: 1, oneToOne: true })
    ])
    .spread(function(chat, troupe) {
      if (!chat) throw new Error('Chat not found');

      return [chat, troupe, userDao.findById(chat.fromUserId, { username: 1, displayName: 1 })];
    })
    .spread(function(chat, troupe, fromUser) {
      var oneToOne = troupe.oneToOne;
      if (!fromUser) throw new Error('User not found');

      if (oneToOne) {
        return {
          text: chat.text,
          title: 'New chat from ' + fromUser.username,
          link: '/' + fromUser.username
        };
      } else {
        return {
          text: fromUser.username + ": " + chat.text,
          title: 'New chat on ' + troupe.uri,
          link: '/' + troupe.uri
        };
      }
    });
}

function filterUsersByNotificationSettings(troupeId, userIds, mentioned) {
  return userTroupeSettingsService.getUserTroupeSettingsForUsersInTroupe(troupeId, 'notifications', userIds)
    .then(function(notificationSettings) {
      return _.filter(userIds, function(userId) {
        var ns = notificationSettings[userId];
        var notificationSetting = ns && ns.push;

        if (notificationSetting === 'mute') return false;
        if (notificationSetting === 'mention') return mentioned;
        return true;
      });
    });
}

// Takes an array of notification items, which looks like
exports.sendOnlineNotifications = function (troupeId, chatId, userIds, mentioned) {
  debug('sendOnlineNotifications to %s users', userIds.length);
  return filterUsersByNotificationSettings(troupeId, userIds, mentioned)
    .then(function(filteredUserIds) {
      if (filteredUserIds.length === 0) return;

      return generateChatMessageNotification(troupeId, chatId)
        .then(function(notification) {
          _.forEach(filteredUserIds, function(userId) {
            var n = {
              userId: userId,
              troupeId: troupeId,
              title: notification.title,
              text: notification.text,
              link: notification.link,
              sound: notification.sound,
              chatId: chatId
            };

            debug("Online notifications: %j", n);
            appEvents.userNotification(n);
          });

        });
    });
};
