/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston = require('winston');
var pushNotificationService = require('../../services/push-notification-service');

module.exports = {
  create: function(req, res, next) {
    winston.info("APN user registration", { deviceId: req.body.deviceId, userId: req.user.id});

    pushNotificationService.registerUser(req.body.deviceId, req.user.id, function(err) {
    if(err) return next(err);
      res.send({ success: true });
    });
  }

};