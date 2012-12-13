/*jslint node: true */
"use strict";

var kue = require('kue'),
    jobs = kue.createQueue(),
    _ = require('underscore'),
    winston = require("winston"),
    statsService = require("../services/stats-service");

var errorDescriptions = {
  0: 'No errors encountered',
  1: 'Processing error',
  2: 'Missing device token',
  3: 'Missing topic',
  4: 'Missing payload',
  5: 'Invalid token size',
  6: 'Invalid topic size',
  7: 'Invalid payload size',
  8: 'Invalid token',
  255: 'None (unknown)'
};

exports.startWorkers = function() {
  var pushNotificationService = require("../services/push-notification-service");
  var nconf = require('../utils/config');
  var apns = require('apn');

  function directSendUserNotification(userIds, notification, callback) {
    var message = notification.message;
    var sound = notification.sound;
    var payload = notification.payload;

    pushNotificationService.findDevicesForUsers(userIds, function(err, devices) {
      if(err) return callback(err);

      winston.debug("Sending to " + devices.length + " potential devices for " + userIds.length + " users");

      devices.forEach(function(device) {
        var sent = false;
        if(device.deviceType === 'APPLE' && device.appleToken) {
          winston.info("Sending apple push notification", { notification: notification });
          var note = new apns.Notification();
          note.badge = 0;
          note.sound = sound;
          note.alert = message;
          note.device = new apns.Device(device.appleToken);
          note.payload = payload;

          apnsConnection.sendNotification(note);
          sent = true;
        }

        // Android/google push notification goes here

        // Blackberry push goes here

        // Finally, send statistics out
        if(sent) {
          statsService.event("push_notification", {
            userId: device.userId,
            deviceType: device.deviceType
          });
        }

      });

      callback();
    });
  }

  function errorEventOccurred(err, notification) {
    var errorDescription = errorDescriptions[err];
    winston.error("APN error", { exception: err, errorDescription: errorDescription, notification: notification ? notification.payload : null });
  }

  winston.info("Starting APN");
  var apnsConnection = new apns.Connection({
      cert: nconf.get('apn:cert'),
      key: nconf.get('apn:key'),
      gateway: nconf.get('apn:gateway'),
      enhanced: true,
      errorCallback: errorEventOccurred
  });

  function failedDeliveryEventOccurred(timeSinceEpoch, deviceToken) {
    winston.error("Failed delivery. Need to remove device", { time: timeSinceEpoch });
  }

  var feedback = new apns.Feedback({
      cert: nconf.get('apn:cert'),
      key: nconf.get('apn:key'),
      gateway: nconf.get('apn:feedback'),
      feedback: failedDeliveryEventOccurred,
      interval: nconf.get('feedbackInterval')
  });

  jobs.process('push-notification', 20, function(job, done) {
    directSendUserNotification(job.data.userIds, job.data.notification, done);
  });
};

exports.sendUserNotification = function(userIds, notification, callback) {
  if(!Array.isArray(userIds)) userIds = [userIds];

  jobs.create('push-notification', {
    title: notification.message,
    userIds: userIds,
    notification: notification
  }).attempts(5)
    .save(callback);
};
