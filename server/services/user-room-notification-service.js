'use strict';

var Promise                   = require('bluebird');
var userTroupeSettingsService = require('./user-troupe-settings-service');
var roomMembershipService     = require('./room-membership-service');
var _                         = require('lodash');
var StatusError               = require('statuserror');

var DEFAULT_NOTIFICATION_SETTING = 'all';

var getSettingForUserRoom = Promise.method(function (userId, roomId) {
  return userTroupeSettingsService.getUserSettings(userId, roomId, 'notifications')
    .then(function(notificationSetting) {
      return notificationSetting && notificationSetting.push || DEFAULT_NOTIFICATION_SETTING;
    });
});

/**
 * Returns the notification settings for users in a room.
 * Hash looks like { userId: 'notification_setting' }
 */
var findSettingsForUsersInRoom = Promise.method(function (roomId, userIds) {
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
var findSettingsForMultiUserRooms = Promise.method(function (userRooms) {
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
 * Update the notification setting for a single user in a room.
 * Returns the new mode for the user
 */
var updateSettingForUserRoom = Promise.method(function (userId, roomId, value) {
  if (value !== 'mention' && value !== 'all' && value !== 'mute') {
    throw new StatusError(400, 'Invalid notification setting ' + value);
  }

  return Promise.join(
    userTroupeSettingsService.setUserSettings(userId, roomId, 'notifications', { push: value }),
    roomMembershipService.setMembershipMode(userId, roomId, value),
    function() {
      return value;
    });
});

/**
 * Update the settings for many users in a room. Return the new mode for the
 * users
 */
var updateSettingsForUsersInRoom = Promise.method(function (roomId, userIds, value) {
  if (value !== 'mention' && value !== 'all' && value !== 'mute' && value !== 'announcements') {
    throw new StatusError(400, 'Invalid notification setting ' + value);
  }

  // CODEDEBT: remove the mention option
  if (value === 'announcements') {
    value = 'mention';
  }

  if (!userIds || !userIds.length) return;

  return Promise.join(
    roomMembershipService.setMembershipModeForUsersInRoom(roomId, userIds, value),
    userTroupeSettingsService.setUserSettingsForUsersInTroupe(roomId, userIds, 'notifications', { push: value }),
    function() {
      return value;
    });
});


/* Exports */
module.exports = {
  getSettingForUserRoom:        getSettingForUserRoom,
  findSettingsForUsersInRoom:    findSettingsForUsersInRoom,
  findSettingsForMultiUserRooms: findSettingsForMultiUserRooms,
  updateSettingForUserRoom:      updateSettingForUserRoom,
  updateSettingsForUsersInRoom:  updateSettingsForUsersInRoom,
};
