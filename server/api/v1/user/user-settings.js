'use strict';

var userSettingsService           = require('../../../services/user-settings-service');
var userDefaultFlagsService       = require('../../../services/user-default-flags-service');
var userDefaultFlagsUpdateService = require('../../../services/user-default-flags-update-service');

var DEFAULT_ROOM_MEMBERSHIP_MODE_KEY = 'defaultRoomMode';

module.exports = {
  id: 'userSetting',

  index: function(req) {
    return userSettingsService.getAllUserSettings(req.resourceUser.id)
      .then(function (settings) {
        return settings || {};
      });
  },

  show: function(req) {
    var settingsKey = req.params.userSetting;
    var userId = req.resourceUser._id;

    if (settingsKey === DEFAULT_ROOM_MEMBERSHIP_MODE_KEY) {
      return userDefaultFlagsService.getDefaultFlagDetailsForUserId(userId);
    }

    return userSettingsService.getUserSettings(userId, settingsKey)
      .then(function(f) {
        return f || {};
      });
  },

  update: function(req) {
    var settings = req.body;
    var userId = req.resourceUser._id;
    var settingsKey = req.params.userSetting;

    if (settingsKey === DEFAULT_ROOM_MEMBERSHIP_MODE_KEY) {
      var mode = settings.mode;
      var override = settings.override;
      return userDefaultFlagsUpdateService.updateDefaultModeForUser(req.resourceUser, mode, override)
        .then(function() {
          return userDefaultFlagsService.getDefaultFlagDetailsForUserId(userId);
        });
    }

    if (settings.hasOwnProperty('value')) {
      settings = settings.value;
    }

    return userSettingsService.setUserSettings(userId, settingsKey, settings)
      .then(function() {
        return settings;
      });
  }

};
