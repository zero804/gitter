"use strict";

var events = require('events');

var localEventEmitter = new events.EventEmitter();

module.exports =  {
    unreadRecalcRequired: function() {
    localEventEmitter.emit('unreadRecalcRequired', true);
    },

    onUnreadRecalcRequired: function(callback) {
    localEventEmitter('unreadRecalcRequired', callback);
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

    userLoggedIntoTroupe: function(userId, troupeId) {
    localEventEmitter.emit('userLoggedIntoTroupe', { troupeId: troupeId, userId: userId });
    },

    onUserLoggedIntoTroupe: function(callback) {
    localEventEmitter.on('userLoggedIntoTroupe', callback);
    },

    userLoggedOutOfTroupe: function(userId, troupeId) {
    localEventEmitter.emit('userLoggedOutOfTroupe', { troupeId: troupeId, userId: userId });
    },

    onUserLoggedOutOfTroupe: function(callback) {
    localEventEmitter.on('userLoggedOutOfTroupe', callback);
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

    dataChange2: function(url, operation, model) {
    localEventEmitter.emit('dataChange2', {
        url: url,
        operation: operation,
        model: model
      });
    },

    onDataChange2: function(callback) {
    localEventEmitter.on('dataChange2', callback);
    },

    chat: function(operation, troupeId, model) {
    localEventEmitter.emit('chat', {
        operation: operation,
        troupeId: troupeId,
        model: model
      });
    },

    onChat: function(callback) {
    localEventEmitter.on('chat', callback);
    },

    eyeballSignal: function(userId, troupeId, signal) {
    localEventEmitter.emit('eyeballSignal', {
        userId: userId,
        troupeId: troupeId,
        signal: signal
      });
    },

    onEyeballSignal: function(callback) {
    localEventEmitter.on('eyeballSignal', function(event) {
        return callback(event.userId, event.troupeId, event.signal);
      });
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

    troupeDeleted: function(options) {
    localEventEmitter.emit('troupeDeleted', options);
    },

    onTroupeDeleted: function(callback) {
    localEventEmitter.on('troupeDeleted', callback);
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
    }

  };
