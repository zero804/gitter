/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env = require('../utils/env');
var logger = env.logger;
var stats = env.stats;

var pushNotificationService = require("../services/push-notification-service");
var unreadItemService = require("../services/unread-item-service");
var workerQueue = require('../utils/worker-queue');
var androidGateway = require('./android-notification-gateway');
var appleGateway = require('./apple-notification-gateway');

function sendNotificationToDevice(notification, badge, device) {

  if((device.deviceType === 'APPLE' ||
      device.deviceType === 'APPLE-DEV' ||
      device.deviceType === 'APPLE-BETA' ||
      device.deviceType === 'APPLE-BETA-DEV') && device.appleToken) {
    logger.info("push-gateway: Sending apple push notification", { userId: device.userId, notification: notification, badge: badge });

    appleGateway.sendNotificationToDevice(notification, badge, device, function(err) {
      if(err) return logger.error('apple push notification failed', { err: err });

      stats.event("push_notification", {
        userId: device.userId,
        deviceType: device.deviceType
      });
    });
  } else if(device.deviceType === 'ANDROID') {
    androidGateway.sendNotificationToDevice(notification, badge, device, function(err, data) {
      if(err) return logger.error('android push notification failed', { err: err });

      stats.event("push_notification", {
        userId: device.userId,
        deviceType: device.deviceType
      });

      if(data) return logger.info('gcm push results', data);
    });
  } else {
    logger.warn('Unknown device type: ' + device.deviceType);
  }
}

var queue = workerQueue.queue('push-notification', {}, function() {

  function directSendUserNotification(userIds, notification, callback) {
    pushNotificationService.findEnabledDevicesForUsers(userIds, function(err, devices) {
      if(err) return callback(err);
      if(!devices.length) return callback();

      var usersWithDevices = devices.map(function(device) { return device.userId; });

      unreadItemService.getBadgeCountsForUserIds(usersWithDevices, function(err, counts) {
        logger.verbose("push-gateway: Sending to " + devices.length + " potential devices for " + userIds.length + " users");

        devices.forEach(function(device) {
          var badge = counts[device.userId];
          sendNotificationToDevice(notification, badge, device);
        });

        callback();

      });

    });
  }

  return function(data, done) {
    directSendUserNotification(data.userIds, data.notification, done);
  };
});

exports.sendUserNotification = function(userIds, notification, callback) {
  if(!Array.isArray(userIds)) userIds = [userIds];

  queue.invoke({ userIds: userIds, notification: notification },callback);
};

exports.sendUsersBadgeUpdates = function(userIds, callback) {
  if(!Array.isArray(userIds)) userIds = [userIds];

  queue.invoke({ userIds: userIds },callback);
};
