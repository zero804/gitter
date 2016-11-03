"use strict";

var env = require('gitter-web-env');
var config = env.config;
var webpush = require('web-push');
var InvalidRegistrationError = require('../invalid-registration-error');
var Promise = require('bluebird');
var vapidNotificationGeneration = require('./vapid-notification-generator');

var DEFAULT_TTL_SECONDS = 86400 * 7; // 7 days

webpush.setVapidDetails(
  config.get('vapid:contact'),
  config.get('vapid:publicKey'),
  config.get('vapid:privateKey'));

/**
 * Predicate function for bluebird
 */
function isVapidGoneError(err) {
  return err && err.statusCode && String(err.statusCode) === '410';
}

function sendNotificationToDevice(notificationType, notificationDetails, device) {
  var pushSubscription = {
    endpoint: device.deviceId,
    keys: {
      auth: device.vapid && device.vapid.auth,
      p256dh: device.vapid && device.vapid.p256dh
    }
  };

  var payloadData = vapidNotificationGeneration(notificationType, notificationDetails, device);
  if (!payloadData) return;

  return Promise.resolve(webpush.sendNotification(pushSubscription, JSON.stringify(payloadData), {
      TTL: DEFAULT_TTL_SECONDS
    }))
    .catch(isVapidGoneError, function(err) {
      throw new InvalidRegistrationError(err.message);
    });
}

module.exports = {
  sendNotificationToDevice: sendNotificationToDevice
}
