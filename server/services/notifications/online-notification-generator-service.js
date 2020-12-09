'use strict';

var Promise = require('bluebird');
var appEvents = require('gitter-web-appevents');
var resolveUserAvatarUrl = require('gitter-web-shared/avatars/resolve-user-avatar-url');
var troupeDao = require('../daos/troupe-dao').lean;
var userDao = require('../daos/user-dao').lean;
var chatService = require('gitter-web-chats');
var _ = require('lodash');
var debug = require('debug')('gitter:app:online-notification-generator');

function generateChatMessageNotification(troupeId, chatId) {
  return Promise.all([
    chatService.findByIdLean(chatId, { fromUserId: 1, virtualUser: 1, text: 1 }),
    troupeDao.findByIdRequired(troupeId, { uri: 1, oneToOne: true })
  ])
    .spread(function(chat, troupe) {
      if (!chat) throw new Error('Chat not found');

      return [
        chat,
        troupe,
        userDao.findById(chat.fromUserId, {
          username: 1,
          displayName: 1,
          gravatarImageUrl: 1,
          gravatarVersion: 1
        })
      ];
    })
    .spread(function(chat, troupe, fromUser) {
      var oneToOne = troupe.oneToOne;
      if (!fromUser) throw new Error('User not found');

      let displayName = fromUser.displayName;
      if (chat.virtualUser) {
        displayName = chat.virtualUser.displayName;
      }

      let avatarUrl = resolveUserAvatarUrl(fromUser, 128);
      if (chat.virtualUser) {
        avatarUrl = chat.virtualUser.avatarUrl;
      }

      if (oneToOne) {
        return {
          text: chat.text,
          title: displayName,
          link: '/' + fromUser.username,
          icon: avatarUrl
        };
      } else {
        return {
          text: chat.text,
          title: displayName + ' 💬 ' + troupe.uri,
          link: '/' + troupe.uri,
          icon: avatarUrl
        };
      }
    });
}

// Takes an array of notification items, which looks like
exports.sendOnlineNotifications = Promise.method(function(troupeId, chatId, userIds) {
  if (!userIds.length) return;
  debug('sendOnlineNotifications to %s users', userIds.length);

  return generateChatMessageNotification(troupeId, chatId).then(function(notification) {
    _.forEach(userIds, function(userId) {
      var n = {
        userId: userId,
        troupeId: troupeId,
        title: notification.title,
        text: notification.text,
        link: notification.link,
        icon: notification.icon,
        sound: notification.sound,
        chatId: chatId
      };

      debug('Online notifications: %j', n);
      appEvents.userNotification(n);
    });
  });
});
