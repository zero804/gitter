"use strict";

var gcm = require('node-gcm');
var Q = require('q');
var nconf = require('../utils/config');
var pushNotificationService = require('../services/push-notification-service');

var MAX_RETRIES = 4;

var sender = new gcm.Sender(nconf.get('gcm:apiKey'));

var sendNotificationToDevice = function(notification, badge, device) {
  if(!notification) {
    // badge only notifications are pointless for android as the apps dont have badges
    return Q.resolve();
  }

  var message = new gcm.Message({
    data: {
      id: notification.roomId,
      name: notification.roomName,
      message: notification.message
    }
  });

  var deferred = Q.defer();
  sender.send(message, [device.androidToken], MAX_RETRIES, deferred.makeNodeResolver());

  return deferred.promise.then(function(body) {
    if (body.canonical_ids) {
      // this registration id/token is an old duplicate which has been superceded by a canonical id,
      // and we've probably just sent two identical messages to the same phone.
      return pushNotificationService.deregisterAndroidDevice(device.androidToken).thenResolve(body);
    } else if (body.failure && body.results[0] && body.results[0].error === "NotRegistered") {
      // app has been uninstalled / token revoked
      return pushNotificationService.deregisterAndroidDevice(device.androidToken).thenResolve(body);
    } else {
      return body;
    }
  });
};

module.exports.sendNotificationToDevice = sendNotificationToDevice;
