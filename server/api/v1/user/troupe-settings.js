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

    return userRoomNotificationService.getSettingForUserRoom(userId, troupeId);
  },

  update: function(req) {
    var userId = req.resourceUser.id;
    var troupeId = req.params.userTroupeId;
    var setting = req.params.setting;

    if (setting !== 'notifications') throw new StatusError(404);

    var settings = req.body;
    var mode = settings && (settings.mode || settings.push);

    if (!mode) throw new StatusError(400, 'Illegal notifications mode');

    return userRoomNotificationService.updateSettingForUserRoom(userId, troupeId, mode, false);
  }

};
