/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";


var apn = require('apn');
var env = require('../utils/env');
var Q = require('q');
var logger = env.logger;
var config = env.config;
var rootDirname = __dirname+'/../..';

var ERROR_DESCRIPTIONS = {
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

logger.info('Starting APN');
var connections = {
  'APPLE': createConnection('Prod'),
  'APPLE-DEV': createConnection('Dev'),
  'APPLE-BETA': createConnection('Beta'),
  'APPLE-BETA-DEV': createConnection('BetaDev')
};

// setup feedback listeners
createFeedbackListener('Prod');
createFeedbackListener('Dev');
createFeedbackListener('Beta');
createFeedbackListener('BetaDev');

var sendNotificationToDevice = function(notification, badge, device) {
  var appleNotification = createAppleNotification(notification, badge);

  var deviceToken = new apn.Device(device.appleToken);

  var connection = connections[device.deviceType];

  if (!connection) return Q.reject(new Error('unknown device type: ' + device.deviceType));

  connection.pushNotification(appleNotification, deviceToken);

  var deferred = Q.defer();
  // timout needed to ensure that the push notification packet is sent.
  // if we dont, SIGINT will kill notifications before they have left.
  // until apn uses proper callbacks, we have to guess that it takes a second.
  setTimeout(function() {
    deferred.resolve();
  }, 1000);

  return deferred.promise;
};

function createConnection(suffix) {
  var connection = new apn.Connection({
    cert: rootDirname + '/' + config.get('apn:cert' + suffix),
    key: rootDirname + '/' + config.get('apn:key' + suffix),
    gateway: config.get('apn:gateway' + suffix),
    enhanced: true,
    errorCallback: function(errCode, notification) {
      try {
        var errorDescription = ERROR_DESCRIPTIONS[errCode];

        if(errCode === 8 && notification.pushDevice) {
          logger.error('Removing invalid device ', {
            deviceName: notification.pushDevice.deviceName,
            deviceId: notification.pushDevice.deviceId
          });

          notification.pushDevice.remove();
          return;
        }

        logger.error('APN error', {
          exception: errCode,
          errorDescription: errorDescription,
          notification: notification ? notification.payload : null
        });
      } catch (e) {
        logger.error('Error while handling APN error:' + e, {exception: e});
      }
    },
    connectionTimeout: 60000
  });

  connection.on('error', function(err) {
    logger.error('APN service (' + suffix + ') experienced an error', { error: err.message });
  });

  return connection;
}

function createFeedbackListener(suffix) {
  try {

    var feedback = new apn.Feedback({
        cert: rootDirname+'/'+config.get('apn:cert' + suffix),
        key: rootDirname+'/'+config.get('apn:key' + suffix),
        gateway: config.get('apn:feedback' + suffix),
        interval: config.get('apn:feedbackInterval' + suffix),
        batchFeedback: true
    });

    feedback.on('feedback', function(devices) {
      if(devices.length) {
        logger.error('Failed delivery (' + suffix + '). Need to remove the following devices', { deviceCount: devices.length });
      }
    });

    feedback.on('error', function(err) {
      logger.error('Feedback service (' + suffix + ') experienced an error', { error: err.message });
    });

  } catch(e) {
    logger.error('Unable to start feedback service (' + suffix + ')', { exception: e });
  }
}

function createAppleNotification(notification, badge) {
  var note = new apn.Notification();
  var message = notification && notification.message;
  var sound = notification && notification.sound;
  var link = notification && notification.link;

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
  return note;
}

module.exports.sendNotificationToDevice = sendNotificationToDevice;