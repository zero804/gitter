'use strict';

var Promise                   = require('bluebird');
var userTroupeSettingsService = require('./user-troupe-settings-service');
var _                         = require('lodash');
var StatusError               = require('statuserror');

var DEFAULT_NOTIFICATION_SETTING = 'all';


/**
 * Returns the notification settings for users in a room.
 * Hash looks like { userId: 'notification_setting' }
 */
var findNotifySettingsForUsersInRoom = Promise.method(function(roomId, userIds) {
  if (!userIds || !userIds.length) return {};

  return userTroupeSettingsService.getUserTroupeSettingsForUsersInTroupe(roomId, 'notifications', userIds)
    .then(function(settings) {
      var result = {};

      _.each(userIds, function(userId) {
        var notificationSettings = settings[userId];
        result[userId] = notificationSettings && notificationSettings.push || DEFAULT_NOTIFICATION_SETTING;
      });

      return result;
    });
});

/**
 * Returns the userTroupe setting for a bunch of users
 * Returns a hash of { [userId:troupeId]: setting}
 */
var findNotifySettingsForMultiUserRooms = Promise.method(function(userRooms) {
  if (!userRooms || !userRooms.length) return {};

  return userTroupeSettingsService.getMultiUserTroupeSettings(userRooms, 'notifications')
    .then(function(settings) {

      var result = _.reduce(userRooms, function(memo, userRoom) {
        var key = userRoom.userId + ':' + userRoom.troupeId;

        var notificationSettings = settings[key];
        memo[key] = notificationSettings && notificationSettings.push || DEFAULT_NOTIFICATION_SETTING;
        return memo;
      }, {});

      return result;
    });
});

/**
 * Update the settings for many users in a room
 */
var updateNotifySettingsForUsersInRoom = Promise.method(function(roomId, userIds, value) {
  if (value !== 'mention' && value !== 'all' && value !== 'mute') {
    throw new StatusError(400, 'Invalid notification setting ' + value);
  }

  if (!userIds) return;

  return userTroupeSettingsService.setUserSettingsForUsersInTroupe(roomId, userIds, 'notifications', { push: value });
});


/* Exports */
module.exports = {
  findNotifySettingsForUsersInRoom:    findNotifySettingsForUsersInRoom,
  findNotifySettingsForMultiUserRooms: findNotifySettingsForMultiUserRooms,
  updateNotifySettingsForUsersInRoom:  updateNotifySettingsForUsersInRoom
};
