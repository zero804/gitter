/*jslint node: true */
"use strict";

var winston = require('winston');
var pushNotificationService = require('../../services/push-notification-service');

module.exports = {
  create: function(req, res, next) {
    winston.info("APN post");
    console.dir(req.body);

    pushNotificationService.registerAppleDevice(req.body.deviceId, new Buffer(req.body.deviceToken, 'base64'), function(err) {
      if(err) return next(err);
      res.send({ success: true });
    });
  }

};