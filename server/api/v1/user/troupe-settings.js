"use strict";

var userRoomNotificationService = require("../../../services/user-room-notification-service");
var StatusError = require('statuserror');

module.exports = {
  id: 'setting',

  show: function(req) {
    var userId = req.resourceUser.id;
    var troupeId = req.params.userTroupeId;
    var setting = req.params.setting;

    if (setting !== 'notifications') throw new StatusError(404);

    return userRoomNotificationService.getSettingForUserRoom(userId, troupeId)
      .then(function(notificationSetting) {
        return {
          push: notificationSetting
        };
      });

  },

  update: function(req) {
    var userId = req.resourceUser.id;
    var troupeId = req.params.userTroupeId;
    var setting = req.params.setting;

    var settings = req.body;

    if (setting !== 'notifications') throw new StatusError(404);

    return userRoomNotificationService.updateSettingForUserRoom(userId, troupeId, settings && settings.push)
      .thenReturn({ success: true });
  }

};
