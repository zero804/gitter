"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var gcm = require('node-gcm');
var Promise = require('bluebird');
var pushNotificationService = require('../services/push-notification-service');

var MAX_RETRIES = 4;

var sender = new gcm.Sender(nconf.get('gcm:apiKey'));

var sendNotificationToDevice = function(notification, badge, device) {
  if(!notification) {
    // badge only notifications are pointless for android as the apps dont have badges
    return Promise.resolve();
  }

  var message = new gcm.Message({
    data: {
      id: notification.roomId,
      name: notification.roomName,
      message: notification.message
    }
  });

  return Promise.fromCallback(function(callback) {
    sender.send(message, [device.androidToken], MAX_RETRIES, callback);
  })
  .then(function(body) {
    if (body.canonical_ids) {
      // this registration id/token is an old duplicate which has been superceded by a canonical id,
      // and we've probably just sent two identical messages to the same phone.
      return pushNotificationService.deregisterAndroidDevice(device.androidToken).thenReturn(body);
    } else if (body.failure && body.results[0] && body.results[0].error === "NotRegistered") {
      // app has been uninstalled / token revoked
      return pushNotificationService.deregisterAndroidDevice(device.androidToken).thenReturn(body);
    } else {
      return body;
    }
  });
};

module.exports.sendNotificationToDevice = sendNotificationToDevice;
