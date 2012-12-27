/*jslint node: true */
"use strict";

var winston = require('winston');
var pushNotificationService = require('../../services/push-notification-service');

module.exports = {
  create: function(req, res, next) {
    winston.info("APN user registration", { deviceId: req.body.deviceId, deviceName: req.user.id});

    pushNotificationService.registerAppleUser(req.body.deviceId, req.user.id, function(err) {
      if(err) return next(err);
      res.send({ success: true });
    });
  }

};