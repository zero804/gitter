/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var pushNotificationGateway = require("../../gateways/push-notification-gateway");

module.exports = function(req, res, next) {
  var deviceId = req.body.deviceId;
  var message = req.body.message;
  var link = req.body.link;

  pushNotificationGateway.sendDeviceNotification(deviceId, { message: message, link: link }, function(err) {
    if(err) return next(err);

    res.send('OK');
  });
};
