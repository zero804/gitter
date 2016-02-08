'use strict';

var Promise                   = require('bluebird');
var userTroupeSettingsService = require('./user-troupe-settings-service');
var _                         = require('lodash');
var StatusError               = require('statuserror');

var DEFAULT_NOTIFICATION_SETTING = 'all';

/* Exports */
module.exports = {
  findSettingForUserRoom:        Promise.method(findSettingForUserRoom),
  findSettingsForUsersInRoom:    Promise.method(findSettingsForUsersInRoom),
  findSettingsForMultiUserRooms: Promise.method(findSettingsForMultiUserRooms),
  updateSettingForUserRoom:      Promise.method(updateSettingForUserRoom),
  updateSettingsForUsersInRoom:  Promise.method(updateSettingsForUsersInRoom),
  updateSettingsForUserRoom:     Promise.method(updateSettingsForUserRoom),
};

function findSettingForUserRoom(userId, roomId) {
  return userTroupeSettingsService.getUserSettings(userId, roomId, 'notifications')
    .then(function(notificationSetting) {
      return notificationSetting && notificationSetting.push || DEFAULT_NOTIFICATION_SETTING;
    });
}

/**
 * Returns the notification settings for users in a room.
 * Hash looks like { userId: 'notification_setting' }
 */
function findSettingsForUsersInRoom(roomId, userIds) {
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
}

/**
 * Returns the userTroupe setting for a bunch of users
 * Returns a hash of { [userId:troupeId]: setting}
 */
function findSettingsForMultiUserRooms(userRooms) {
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
}

function updateSettingForUserRoom(userId, roomId, value) {
  if (value !== 'mention' && value !== 'all' && value !== 'mute') {
    throw new StatusError(400, 'Invalid notification setting ' + value);
  }

  return userTroupeSettingsService.setUserSettings(userId, roomId, 'notifications', { push: value });
}

/**
 * Update the settings for many users in a room
 */
function updateSettingsForUsersInRoom(roomId, userIds, value) {
  if (value !== 'mention' && value !== 'all' && value !== 'mute') {
    throw new StatusError(400, 'Invalid notification setting ' + value);
  }

  if (!userIds) return;

  return userTroupeSettingsService.setUserSettingsForUsersInTroupe(roomId, userIds, 'notifications', { push: value });
}

/**
 * Update the notification setting for a single user in a room
 */
function updateSettingsForUserRoom(userId, roomId, value) {
  if (value !== 'mention' && value !== 'all' && value !== 'mute') {
    throw new StatusError(400, 'Invalid notification setting ' + value);
  }

  return userTroupeSettingsService.setUserSettings(userId, roomId, 'notifications', { push: value });
}
