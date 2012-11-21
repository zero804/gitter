/*jslint node: true */
"use strict";

var winston = require('winston');
var pushNotificationService = require('../../services/push-notification-service');

module.exports = {
  create: function(req, res, next) {
    winston.info("User APN post");
    console.dir(req.body);

    pushNotificationService.registerAppleUser(req.body.deviceId, req.user.id, function(err) {
      if(err) return next(err);
      res.send({ success: true });
    });
  }

};