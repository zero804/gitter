/*jslint node: true */
"use strict";

var pushNotificationService = require("../services/push-notification-service");
var winston = require("winston");
var nconf = require('../utils/config');
var apns = require('apn');

function sendUserNotification(userId, message, callback) {
  pushNotificationService.findDevicesForUser(userId, function(err, devices) {
    if(err) return callback(err);
    devices.forEach(function(device) {

      if(device.deviceType === 'APPLE') {
        winston.info("Sending apple push notification");
        var note = new apns.Notification();
        note.badge = 3;
        note.alert = "You have a new message";
        note.device = new apns.Device(device.appleToken);

        apnsConnection.sendNotification(note);
      }

    });
  });
}

function sendError(err, notification) {
  winston.error("APN error", { exception: err, notification: notification });
}

winston.info("Starting APN");
var apnsConnection = new apns.Connection({
    cert: nconf.get('apn:cert'),
    key: nconf.get('apn:key'),
    gateway: nconf.get('apn:gateway'),
    enhanced: true,
    errorCallback: sendError
});

//sendUserNotification('4faae858889d9e0000000003', 'Hello', function(err) {
//  if(err) winston.error("Notification error", { exception: err });
//});

function failedDelivery(timeSinceEpoch, deviceToken) {
  winston.error("Failed delivery. Need to remove device", { time: timeSinceEpoch });
}

var feedback = new apns.Feedback({
    cert: nconf.get('apn:cert'),
    key: nconf.get('apn:key'),
    gateway: nconf.get('apn:feedback'),
    feedback: failedDelivery,
    interval: nconf.get('feedbackInterval')
});