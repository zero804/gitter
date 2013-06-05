/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston = require('winston');
var pushNotificationService = require('../../services/push-notification-service');

module.exports = {
  create: function(req, res, next) {
    var deviceId = req.body.deviceId;
    var deviceName = req.body.deviceName;
    var deviceType = req.body.deviceType;
    var deviceToken = new Buffer(req.body.deviceToken, 'base64');
    var appVersion = req.body.version;
    var appBuild = req.body.build;

    // Backwards compatiblity, remove later
    if(!deviceType) {
      deviceType = 'APPLE-DEV';
    }

    winston.info("APN device registration", { deviceId: deviceId, deviceName: deviceName, deviceType: deviceType });
    pushNotificationService.registerDevice(deviceId, deviceType, deviceToken, deviceName, appVersion, appBuild, function(err) {
      if(err) return next(err);

      res.send({ success: true });
    });
  }

};