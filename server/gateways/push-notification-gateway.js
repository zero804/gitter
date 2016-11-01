"use strict";

var env = require('gitter-web-env');
var Promise = require('bluebird');
var logger = env.logger.get('push-notifications');
var stats = env.stats;
var pushNotificationService = require("../services/push-notification-service");
var unreadItemService = require("../services/unread-items");
var androidGateway = require('./android-notification-gateway');
var iosGateway = require('./ios-notification-gateway');
var vapidGateway = require('./vapid-notification-gateway');
var debug = require('debug')('gitter:app:push-notification-gateway');
var InvalidRegistrationError = require('./invalid-registration-error');

function sendNotificationToDevice(notification, badge, device) {
  debug('sendNotificationToDevice: %j, badge=%s', notification, device);

  var notificationPromise;
  switch(device.deviceType) {
    case 'APPLE':
    case 'APPLE-DEV':
      if (!device.appleToken) {
        logger.warn('Missing apple token');
        return;
      }

      notificationPromise = iosGateway.sendNotificationToDevice(notification, badge, device);
      break;

    case 'ANDROID':
      notificationPromise = androidGateway.sendNotificationToDevice(notification, badge, device)
      break;

    case 'VAPID':
      notificationPromise = vapidGateway.sendNotificationToDevice(notification, badge, device)
      break;

    default:
      logger.warn('Unknown device type: ' + device.deviceType);
      return;
  }

  if (!notificationPromise) return;

  return Promise.resolve(notificationPromise)
    .bind({
      device: device
    })
    .tap(function() {
      var device = this.device;

      stats.event("push_notification", {
        userId: device.userId,
        deviceType: device.deviceType
      });
    })
    .catch(InvalidRegistrationError, function() {
      var device = this.device;
      logger.info('Removing invalid device', { id: device._id, userId: device.userId });
      return pushNotificationService.deregisterDeviceById(device._id);
    })
    .catch(function(err) {
      var device = this.device;
      logger.warn('Failure sending notification', { id: device._id, user: device.userId, exception: err });
    })
}

function sendUserNotification(userId, notification) {
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
}

function sendUsersBadgeUpdates(userIds) {
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
}

module.exports = {
  sendUserNotification: sendUserNotification,
  sendUsersBadgeUpdates: sendUsersBadgeUpdates
}
