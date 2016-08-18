"use strict";

var Promise = require('bluebird');
var events = require('events');
var assert = require('assert');

function makeEmitter() {
  var localEventEmitter = new events.EventEmitter();

  return {
    /* This is only good for testing */
    removeAllListeners: function() {
      localEventEmitter.removeAllListeners()
    },

    // this is really useful for testing
    addListener: function(eventName, expected) {
      var promise = new Promise(function(resolve) {
        localEventEmitter.on(eventName, function(res) {
          // TODO: This probably only really works with dataChange2 for now.
          // Make it more generic.

          // First filter by url and operation, as other events may have been emitted
          if (expected.url && expected.url !== res.url) return;
          if (expected.operation && expected.operation !== res.operation) return;
          // Check model with deepEqual
          if (expected.model) {
            resolve(assert.deepEqual(res.model, expected.model));
          } else {
            resolve();
          }
        });
      });

      return function() {
        return promise;
      };
    },

    newUnreadItem: function(userId, troupeId, items, online) {
      localEventEmitter.emit('newUnreadItem', {
        userId: userId,
        troupeId: troupeId,
        items: items,
        online: online
      });
    },

    onNewUnreadItem: function(callback) {
      localEventEmitter.on('newUnreadItem', callback);
    },

    newOnlineNotification: function(troupeId, chatId, userIds) {
      localEventEmitter.emit('newOnlineNotification', troupeId, chatId, userIds);
    },

    onNewOnlineNotification: function(callback) {
      localEventEmitter.on('newOnlineNotification', callback);
    },

    newPushNotificationForChat: function(troupeId, chatId, userIds, mentioned) {
      localEventEmitter.emit('newPushNotificationForChat', troupeId, chatId, userIds, mentioned);
    },

    onNewPushNotificationForChat: function(callback) {
      localEventEmitter.on('newPushNotificationForChat', callback);
    },

    unreadItemsRemoved: function(userId, troupeId, items) {
      localEventEmitter.emit('unreadItemRemoved', {
        userId: userId,
        troupeId: troupeId,
        items: items
      });
    },

    onUnreadItemsRemoved: function(callback) {
      localEventEmitter.on('unreadItemRemoved', callback);
    },

    troupeUnreadCountsChange: function(data) {
      localEventEmitter.emit('troupeUnreadCountsChange', data);
    },

    onTroupeUnreadCountsChange: function(callback) {
      localEventEmitter.on('troupeUnreadCountsChange', callback);
    },

    troupeMentionCountsChange: function(data) {
      localEventEmitter.emit('troupeMentionCountsChange', data);
    },

    onTroupeMentionCountsChange: function(callback) {
      localEventEmitter.on('troupeMentionCountsChange', callback);
    },

    userMentionedInNonMemberRoom: function(data) {
      localEventEmitter.emit('userMentionedInNonMemberRoom', data);
    },

    onUserMentionedInNonMemberRoom: function(callback) {
      localEventEmitter.on('userMentionedInNonMemberRoom', callback);
    },

    // Deprecated
    newNotification: function(troupeId, userId, notificationText, notificationLink) {
      localEventEmitter.emit('newNotification', {
        troupeId: troupeId,
        userId: userId,
        notificationText: notificationText,
        notificationLink: notificationLink
      });
    },

    // Deprecated
    onNewNotification: function(callback) {
      localEventEmitter.on('newNotification', callback);
    },

    userNotification: function(options) {
      localEventEmitter.emit('userNotification',options);
    },

    // Deprecated
    onUserNotification: function(callback) {
      localEventEmitter.on('userNotification', callback);
    },

    dataChange2: function(url, operation, model, type) {
      localEventEmitter.emit('dataChange2', {
        url: url,
        operation: operation,
        model: model,
        type: type
      });
    },

    onDataChange2: function(callback) {
      localEventEmitter.on('dataChange2', callback);
    },

    userRemovedFromTroupe: function(options) {
      localEventEmitter.emit('userRemovedFromTroupe', options);
    },

    onUserRemovedFromTroupe: function(callback) {
      localEventEmitter.on('userRemovedFromTroupe', callback);
    },

    batchUserBadgeCountUpdate: function(data) {
      localEventEmitter.emit('batchUserBadgeCountUpdate', data);
    },

    onBatchUserBadgeCountUpdate: function(callback) {
      localEventEmitter.on('batchUserBadgeCountUpdate', callback);
    },

    repoPermissionsChangeDetected: function(uri, isPrivate) {
      localEventEmitter.emit('repo_perm_change', {
        uri: uri,
        isPrivate: isPrivate
      });
    },

    onRepoPermissionsChangeDetected: function(callback) {
      localEventEmitter.on('repo_perm_change', callback);
    },

    userTroupeLurkModeChange: function(data) {
      localEventEmitter.emit('user_troupe_lurk_mode_change', data);
    },

    onUserTroupeLurkModeChange: function(callback) {
      localEventEmitter.on('user_troupe_lurk_mode_change', callback);
    },

    newLurkActivity: function(data) {
      localEventEmitter.emit('new_lurk_activity', data);
    },

    onNewLurkActivity: function(callback) {
      localEventEmitter.on('new_lurk_activity', callback);
    },

    markAllRead: function(data) {
      localEventEmitter.emit('mark_all_read', data);
    },

    onMarkAllRead: function(callback) {
      localEventEmitter.on('mark_all_read', callback);
    },

    repoRenameDetected: function(oldFullname, newFullname) {
      localEventEmitter.emit('repo_rename_detected', oldFullname, newFullname);
    },

    onRepoRenameDetected: function(callback) {
      localEventEmitter.on('repo_rename_detected', callback);
    },

    destroyUserTokens: function(userId) {
      localEventEmitter.emit('destroy_user_tokens', userId);
    },

    onDestroyUserTokens: function(callback) {
      localEventEmitter.on('destroy_user_tokens', callback);
    },

    roomMemberPermCheckFailed: function(roomId, userId) {
      localEventEmitter.emit('room_membership_perm_check_failed', roomId, userId);
    },

    onRoomMemberPermCheckFailed: function(callback) {
      localEventEmitter.on('room_membership_perm_check_failed', callback);
    }

  };
}

var defaultListener = makeEmitter();

module.exports = defaultListener;
module.exports.testOnly = {
  makeEmitter: makeEmitter,
  addListener: function(eventName, expected) {
    return defaultListener.addListener(eventName, expected);
  },
  removeAllListeners: function() {
    defaultListener.removeAllListeners();
  }
};
