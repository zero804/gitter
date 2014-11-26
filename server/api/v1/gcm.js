/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var logger = require('../../utils/env').logger;
var pushNotificationService = require('../../services/push-notification-service');

module.exports = function(req, res, next) {
  var deviceId = req.body.deviceId;
  var deviceName = req.body.deviceName;
  var registrationId = req.body.registrationId;
  var appVersion = req.body.version;
  var userId = req.user.id;

  logger.info("GCM device registration", { deviceId: deviceId, deviceName: deviceName });
  pushNotificationService.registerAndroidDevice(deviceId, deviceName, registrationId, appVersion, userId, function(err) {
    if(err) return next(err);

    res.send({ success: true });
  });
};
