"use strict";

var userTroupeSettingsService = require("../../../services/user-troupe-settings-service");
var userRoomNotificationService = require("../../../services/user-room-notification-service");

module.exports = {
  id: 'setting',
  index: function(req) {
    var userId = req.resourceUser.id;
    var troupeId = req.params.userTroupeId;

    /* TODO: deprecate? */
    return userTroupeSettingsService.getAllUserSettings(userId, troupeId)
      .then(function(settings) {
        return settings || {};
      });
  },

  show: function(req) {
    var userId = req.resourceUser.id;
    var troupeId = req.params.userTroupeId;
    var setting = req.params.setting;

    if (setting === 'notifications') {
      return userRoomNotificationService.getSettingForUserRoom(userId, troupeId)
        .then(function(notificationSetting) {
          return {
            push: notificationSetting
          };
        });
    }

    // TODO: should we handle this?
    return userTroupeSettingsService.getUserSettings(userId, troupeId, setting)
      .then(function(f) {
        return f || {};
      });
  },

  update: function(req) {
    var userId = req.resourceUser.id;
    var troupeId = req.params.userTroupeId;
    var setting = req.params.setting;

    var settings = req.body;

    if (setting === 'notifications') {
      return userRoomNotificationService.updateSettingForUserRoom(userId, troupeId, settings && settings.push);
    }

    return userTroupeSettingsService.setUserSettings(userId, troupeId, setting, settings);
  }

};
