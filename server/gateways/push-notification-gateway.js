/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston = require("winston");
var pushNotificationService = require("../services/push-notification-service");
var unreadItemService = require("../services/unread-item-service");
var nconf = require('../utils/config');
var apns = require('apn');
var statsService = require("../services/stats-service");
var workerQueue = require('../utils/worker-queue');

var nexmo = require('easynexmo/lib/nexmo');
nexmo.initialize('0b93c6bc', '483931e4');

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

var basePath = nconf.get('web:basepath');

function errorEventOccurred(err, notification) {
  try {
    var errorDescription = errorDescriptions[err];

    if(err === 8 && notification.pushDevice) {
      winston.error("Removing invalid device ", { deviceName: notification.pushDevice.deviceName, deviceId: notification.pushDevice.deviceId });
      notification.pushDevice.remove();
      return;
    }

    winston.error("APN error", {
      exception: err,
      errorDescription: errorDescription,
      notification: notification ? notification.payload : null
    });
  } catch (e) {
    winston.error("Error while handling APN error:" + e, {exception: e});
  }
}

winston.info("Starting APN");
var apnsConnectionDev = new apns.Connection({
    cert: nconf.get('apn:certDev'),
    key: nconf.get('apn:keyDev'),
    gateway: nconf.get('apn:gatewayDev'),
    enhanced: true,
    errorCallback: errorEventOccurred,
    connectionTimeout: 60000
});

apnsConnectionDev.on("error", function(err) {
    winston.error("APN service (dev) experienced an error", { error: err.message });
});

var apnsConnectionBetaDev = new apns.Connection({
    cert: nconf.get('apn:certBetaDev'),
    key: nconf.get('apn:keyBetaDev'),
    gateway: nconf.get('apn:gatewayBetaDev'),
    enhanced: true,
    errorCallback: errorEventOccurred,
    connectionTimeout: 60000
});

apnsConnectionBetaDev.on("error", function(err) {
    winston.error("APN service (beta dev) experienced an error", { error: err.message });
});

var apnsConnectionBeta = new apns.Connection({
    cert: nconf.get('apn:certBeta'),
    key: nconf.get('apn:keyBeta'),
    gateway: nconf.get('apn:gatewayBeta'),
    enhanced: true,
    errorCallback: errorEventOccurred,
    connectionTimeout: 60000
});

apnsConnectionBeta.on("error", function(err) {
    winston.error("APN service (beta) experienced an error", { error: err.message });
});

var apnsConnection = new apns.Connection({
    cert: nconf.get('apn:certProd'),
    key: nconf.get('apn:keyProd'),
    gateway: nconf.get('apn:gatewayProd'),
    enhanced: true,
    errorCallback: errorEventOccurred,
    connectionTimeout: 60000
});

apnsConnection.on("error", function(err) {
    winston.error("APN service (prod) experienced an error", { error: err.message });
});


['Dev', 'BetaDev', 'Beta', 'Prod'].forEach(function(suffix) {
  try {

    var feedback = new apns.Feedback({
        cert: nconf.get('apn:cert' + suffix),
        key: nconf.get('apn:key' + suffix),
        gateway: nconf.get('apn:feedback' + suffix),
        interval: nconf.get('apn:feedbackInterval' + suffix),
        batchFeedback: true
    });

    feedback.on("feedback", function(devices) {
        winston.error("Failed delivery. Need to remove the following devices", { deviceCount: devices.length });
    });

    feedback.on("error", function(err) {
        winston.error("Feedback service experienced an error", { error: err.message });
    });

  } catch(e) {
    winston.error('Unable to start feedback service ', { exception: e });
  }
});


function sendNotificationToDevice(notification, badge, device) {
  var sent = false;
  var message = notification && notification.message;
  var sound = notification && notification.sound;
  var link = notification && notification.link;

  if((device.deviceType === 'APPLE' ||
      device.deviceType === 'APPLE-DEV' ||
      device.deviceType === 'APPLE-BETA' ||
      device.deviceType === 'APPLE-BETA-DEV') && device.appleToken) {
    winston.info("push-gateway: Sending apple push notification", { userId: device.userId, notification: notification });
    var note = new apns.Notification();


    if(badge >= 0) {
      note.badge = badge;
    }

    if(message) {
      note.setAlertText(message);
    }

    if(sound) {
      note.sound = sound;
    }

    if(link) {
      /* For IOS7 push notifications */
      note.contentAvailable = true;

      note.payload = { 'l': link };
    }

    //note.alert = message;
    var deviceToken = new apns.Device(device.appleToken);

    note.pushDevice = device;

    switch(device.deviceType) {
      case 'APPLE':
        apnsConnection.pushNotification(note, deviceToken);
        break;

      case 'APPLE-BETA-DEV':
        apnsConnectionBetaDev.pushNotification(note, deviceToken);
        break;

      case 'APPLE-BETA':
        apnsConnectionBeta.pushNotification(note, deviceToken);
        break;

      case 'APPLE-DEV':
        apnsConnectionDev.pushNotification(note, deviceToken);
        break;
      default:
        winston.warn('Unknown device type: ' + device.deviceType);
    }

    sent = true;
  } else if(device.deviceType === 'SMS') {
    sendSMSMessage(device.mobileNumber, notification.smsText);
    sent = true;
  } else {
    winston.warn('Unknown device type: ' + device.deviceType);
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

}

function sendSMSMessage(mobileNumber, message) {
  nexmo.sendTextMessage('Troupe',mobileNumber,message, function(err) {
    if(err) winston.error('Unable to send SMS message: ' + err, { exception: err });
  });
}

var queue = workerQueue.queue('push-notification', {}, function() {

  function directSendUserNotification(userIds, notification, callback) {
    pushNotificationService.findEnabledDevicesForUsers(userIds, function(err, devices) {
      if(err) return callback(err);
      if(!devices.length) return callback();

      var usersWithDevices = devices.map(function(device) { return device.userId; });

      unreadItemService.getBadgeCountsForUserIds(usersWithDevices, function(err, counts) {
        winston.verbose("push-gateway: Sending to " + devices.length + " potential devices for " + userIds.length + " users");

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


exports.sendDeviceNotification = function(deviceId, notification, callback) {
  pushNotificationService.findDeviceForDeviceId(deviceId, function(err, device) {
    if(err) return callback(err);
    if(!device) return callback(404);

    sendNotificationToDevice(notification, undefined, device);

    callback();
  });
};
