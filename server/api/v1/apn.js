/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var winston = require('winston');
var pushNotificationService = require('../../services/push-notification-service');

module.exports = {
  create: function(req, res, next) {
    winston.info("APN device registration", { deviceId: req.body.deviceId, deviceName: req.body.deviceName });

    pushNotificationService.registerAppleDevice(req.body.deviceId, req.body.deviceName, new Buffer(req.body.deviceToken, 'base64'), function(err) {
      if(err) return next(err);
      res.send({ success: true });
    });
  }

};