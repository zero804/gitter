/*jslint node: true */
"use strict";

var kue = require('kue'),
    jobs = kue.createQueue(),
    _ = require('underscore'),
    winston = require("winston");

exports.startWorkers = function() {
  var pushNotificationService = require("../services/push-notification-service");
  var nconf = require('../utils/config');
  var apns = require('apn');

  function directSendUserNotification(userIds, message, callback) {
    pushNotificationService.findDevicesForUsers(userIds, function(err, devices) {
      if(err) return callback(err);

      winston.debug("Sending to " + devices.length + " devices for " + userIds.length + " users");

      devices.forEach(function(device) {

        if(device.deviceType === 'APPLE') {
          winston.info("Sending apple push notification");
          var note = new apns.Notification();
          note.badge = 0;
          note.alert = message;
          note.device = new apns.Device(device.appleToken);

          process.nextTick(function() {
            apnsConnection.sendNotification(note);
          });
        }
      });

      callback();
    });
  }

  function errorEventOccurred(err, notification) {
    winston.error("APN error", { exception: err, notification: notification.payload });
  }

  winston.info("Starting APN");
  var apnsConnection = new apns.Connection({
      cert: nconf.get('apn:cert'),
      key: nconf.get('apn:key'),
      gateway: nconf.get('apn:gateway'),
      enhanced: true,
      errorCallback: errorEventOccurred
  });

  //sendUserNotification('4faae858889d9e0000000003', 'Hello', function(err) {
  //  if(err) winston.error("Notification error", { exception: err });
  //});

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
    directSendUserNotification(job.data.userIds, job.data.message, done);
  });
};

exports.sendUserNotification = function(userIds, message) {
  if(!Array.isArray(userIds)) userIds = [userIds];

  jobs.create('push-notification', {
    title: message,
    userIds: userIds,
    message: message
  }).attempts(5)
    .save();
};
