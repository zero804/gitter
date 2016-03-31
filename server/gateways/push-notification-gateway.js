"use strict";

var env = require('gitter-web-env');
var Promise = require('bluebird');
var logger = env.logger;
var stats = env.stats;
var pushNotificationService = require("../services/push-notification-service");
var unreadItemService = require("../services/unread-items");
var androidGateway = require('./android-notification-gateway');
var iosGateway = require('./ios-notification-gateway');
var debug = require('debug')('gitter:push-notification-gateway');

function sendNotificationToDevice(notification, badge, device) {
  var notificationPromise;
  debug('sendNotificationToDevice: %j, badge=%s', notification, device);

  if (!device.deviceType) {
    logger.warn('Unknown device type: ' + device.deviceType);
    return Promise.resolve();
  }

  if (device.deviceType.indexOf('APPLE') === 0 && device.appleToken) {
    notificationPromise = iosGateway.sendNotificationToDevice(notification, badge, device);
  } else if (device.deviceType === 'ANDROID') {
    notificationPromise = androidGateway.sendNotificationToDevice(notification, badge, device)
      .then(function(data) {
        if (data) logger.info('gcm push results', data);
      });
  } else {
    logger.warn('Unknown device type: ' + device.deviceType);
    return Promise.resolve();
  }

  return notificationPromise.then(function() {
    stats.event("push_notification", {
      userId: device.userId,
      deviceType: device.deviceType
    });
  });
}

exports.sendUserNotification = function(userId, notification) {
  return pushNotificationService.findEnabledDevicesForUsers([userId])
    .then(function(devices) {
      if(!devices.length) return;

      return unreadItemService.getBadgeCountsForUserIds([userId]).then(function(counts) {
        debug("Sending to %s potential devices for %s: %j", devices.length, userId, notification);

        var badge = counts[userId] || 0;

        return Promise.map(devices, function(device) {
          return sendNotificationToDevice(notification, badge, device);
        });
    });

  });
};

exports.sendUsersBadgeUpdates = function(userIds) {
  debug('Sending push notifications to %s users', userIds.length);

  if(!Array.isArray(userIds)) userIds = [userIds];

  return pushNotificationService.findEnabledDevicesForUsers(userIds)
    .then(function(devices) {
      if (!devices.length) return;

      // only ios supports badges
      var iosDevices = devices.filter(function(device) {
        return device.deviceType && device.deviceType.indexOf('APPLE') === 0;
      });

      var iosUsers = iosDevices.map(function(device) {
        return device.userId;
      });

      debug("Sending badge updates to %s potential devices for %s users", iosDevices.length, iosUsers.length);

      return unreadItemService.getBadgeCountsForUserIds(iosUsers)
        .then(function(counts) {
          return Promise.map(iosDevices, function(device) {
            var badge = counts[device.userId] || 0;
            return sendNotificationToDevice(null, badge, device);
          });
        });

    });
};
