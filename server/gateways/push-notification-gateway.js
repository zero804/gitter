"use strict";

var env = require('gitter-web-env');
var Promise = require('bluebird');
var logger = env.logger.get('push-notifications');
var stats = env.stats;
var pushNotificationService = require("../services/push-notification-service");
var unreadItemService = require("../services/unread-items");
var androidGateway = require('./android/android-notification-gateway');
var iosGateway = require('./ios/ios-notification-gateway');
var vapidGateway = require('./vapid/vapid-notification-gateway');
var debug = require('debug')('gitter:app:push-notification-gateway');
var InvalidRegistrationError = require('./invalid-registration-error');
var _ = require('lodash');

function getGatewayForDevice(device) {
  switch(device.deviceType) {
    case 'APPLE':
    case 'APPLE-DEV':
      if (!device.appleToken) {
        return;
      }

      return iosGateway;

    case 'ANDROID':
      return androidGateway;

    case 'VAPID':
      return vapidGateway;

    default:
      logger.warn('Unknown device type', { deviceType: device.deviceType });
      return;
  }
}

function sendNotificationToDevice(notificationType, notificationDetails, device) {
  var gateway = getGatewayForDevice(device);

  if (!gateway) return;

  var notificationPromise = gateway.sendNotificationToDevice(notificationType, notificationDetails, device);
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
      // The gateway has told us to get rid of this
      // device....
      var device = this.device;
      logger.info('Removing invalid device', { id: device._id, userId: device.userId });
      return pushNotificationService.deregisterDeviceById(device._id);
    })
    .catch(function(err) {
      var device = this.device;
      logger.warn('Failure sending notification', { id: device._id, user: device.userId, exception: err });
    })
}

function sendUserNotification(notificationType, userId, options) {
  return pushNotificationService.findEnabledDevicesForUsers([userId])
    .bind({
      devices: null,
      options: options,
      notificationType: notificationType
    })
    .then(function(devices) {
      if(!devices.length) return;
      this.devices = devices;

      var hasDevicesSupportingBadges = _.some(devices, function(device) {
        return device.deviceType === 'APPLE' || device.deviceType === 'APPLE-DEV';
      });

      // Skip badge calculation if we don't need it....
      if (!hasDevicesSupportingBadges) return null;

      return unreadItemService.getBadgeCountsForUserIds([userId]);
    })
    .then(function(counts) {
      var devices = this.devices;
      if (!devices || !devices.length) return;
      var options = this.options;
      var notificationType = this.notificationType;

      var badgeCount = counts && counts[userId] || 0;

      var notificationDetails = _.extend({
        badgeCount: badgeCount,
      }, options);

      return Promise.map(devices, function(device) {
        return sendNotificationToDevice(notificationType, notificationDetails, device);
      });
    });
}

function sendUsersBadgeUpdates(userIds) {
  debug('Sending push notifications to %s users', userIds.length);

  // This seems a bit sketchy....
  if(!Array.isArray(userIds)) userIds = [userIds];

  return pushNotificationService.findEnabledDevicesForUsers(userIds, { supportsBadges: true })
    .then(function(devices) {
      if (!devices.length) return;

      var uniqueUserIds = Object.keys(_.reduce(function(memo, device) {
        memo[device.userId] = 1;
        return memo;
      }, {}));

      debug("Sending badge updates to %s potential devices for %s users", devices.length, uniqueUserIds.length);

      return unreadItemService.getBadgeCountsForUserIds(uniqueUserIds)
        .then(function(counts) {

          return Promise.map(devices, function(device) {
            var badge = counts[device.userId] || 0;

            return iosGateway.sendBadgeUpdateToDevice(badge, device);
          });
        });

    });
}

module.exports = {
  sendUserNotification: sendUserNotification,
  sendUsersBadgeUpdates: sendUsersBadgeUpdates
}
