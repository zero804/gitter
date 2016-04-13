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

    // NOTE: this didn't used to return and when the return was added it
    // started causing the left menu to respond to the payload whereas before
    // it was "fire and forget" and this API just returned 200 OK without a
    // json response. So as a quick temporary fix we're checking for the exact
    // key and emulating the old behavior for that one case for now.
    // cc @suprememoocow
    return userSettingsService.setUserSettings(userId, settingsKey, settings)
      .then(function() {
        if (settingsKey == 'leftRoomMenu') {
          // blank object should be close enough to a 200 OK and hopefully will
          // stop backbone from picking it up.
          return {};
        } else {
          return settings;
        }
      });
  }

};
