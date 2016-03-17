"use strict";

var apn = require('apn');
var debug = require('debug')('gitter:ios-notification-gateway');
var env = require('gitter-web-env');
var Promise = require('bluebird');
var pushNotificationService = require('../services/push-notification-service');
var logger = env.logger;
var config = env.config;
var errorReporter = env.errorReporter;

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

var connections = {
  'APPLE': createConnection('Prod', true),
  'APPLE-DEV': createConnection('Dev'),
  'APPLE-BETA': createConnection('Beta', true),
  'APPLE-BETA-DEV': createConnection('BetaDev')
};

/* Only create the feedback listeners for the current environment */
switch(config.get('NODE_ENV') || 'dev') {
  case 'prod':
    createFeedbackListener('Prod', true);
    break;

  case 'beta':
    createFeedbackListener('Beta', true);
    createFeedbackListener('BetaDev');
    break;

  case 'dev':
    createFeedbackListener('Dev');
    break;
}


function sendNotificationToDevice(notification, badge, device) {
  var appleNotification = createAppleNotification(notification, badge);

  var deviceToken = new apn.Device(device.appleToken);

  var connection = connections[device.deviceType];

  if (!connection) return Promise.reject(new Error('unknown device type: ' + device.deviceType));

  connection.pushNotification(appleNotification, deviceToken);

  // timout needed to ensure that the push notification packet is sent.
  // if we dont, SIGINT will kill notifications before they have left.
  // until apn uses proper callbacks, we have to guess that it takes a second.
  return Promise.delay(1000);
}

function createConnection(suffix, isProduction) {
  debug('ios push notification gateway (%s) starting', suffix);

  var connection = new apn.Connection({
    cert: rootDirname + '/' + config.get('apn:cert' + suffix),
    key: rootDirname + '/' + config.get('apn:key' + suffix),
    production: isProduction,
    connectionTimeout: 60000
  });

  connection.on('error', function(err) {
    logger.error('ios push notification gateway (' + suffix + ') experienced an error', { error: err.message });
    errorReporter(err, { apnEnv: suffix }, { module: 'ios-notification-gateway' });
  });

  connection.on('socketError', function(err) {
    logger.error('ios push notification gateway (' + suffix + ') experienced a socketError', { error: err.message });
    errorReporter(err, { apnEnv: suffix }, { module: 'ios-notification-gateway' });
  });

  connection.on('transmissionError', function(errCode, notification, device) {
    var err = new Error('apn transmission error ' + errCode +': ' + ERROR_DESCRIPTIONS[errCode]);
    if (errCode === 8) {
      logger.warn('ios push notification gateway (' + suffix + ') invalid device token for "' + suffix + '". Need to remove the following device sometime:', { device: device });
    } else {
      logger.error('ios push notification gateway (' + suffix + ')', { error: err.message });
      errorReporter(err, { apnEnv: suffix }, { module: 'ios-notification-gateway' });
    }
  });

  return connection;
}

function createFeedbackListener(suffix, isProduction) {
  try {
    debug('ios push notification feedback listener (%s) starting', suffix);

    var feedback = new apn.Feedback({
      cert: rootDirname+'/'+config.get('apn:cert' + suffix),
      key: rootDirname+'/'+config.get('apn:key' + suffix),
      interval: config.get('apn:feedbackInterval'),
      batchFeedback: true,
      production: isProduction
    });

    feedback.on('feedback', function(item) {
      var deviceTokens = item.map(function(item) {
        return item.device.token;
      });

      return pushNotificationService.deregisterIosDevices(deviceTokens)
        .catch(function(err) {
          logger.error('ios push notification tokens (' + suffix + ') failed to remove after feedback', { error: err.message });
          errorReporter(err, { apnEnv: suffix }, { module: 'ios-notification-gateway' });
        });
    });

    feedback.on('error', function(err) {
      logger.error('ios push notification feedback (' + suffix + ') experienced an error', { error: err.message });
      errorReporter(err, { apnEnv: suffix }, { module: 'ios-notification-gateway' });
    });

    feedback.on('feedbackError', function(err) {
      logger.error('ios push notification feedback (' + suffix + ') experienced a feedbackError', { error: err.message });
      errorReporter(err, { apnEnv: suffix }, { module: 'ios-notification-gateway' });
    });

  } catch(e) {
    logger.error('Unable to start feedback service (' + suffix + ')', { exception: e });
    errorReporter(e, { apnEnv: suffix }, { module: 'ios-notification-gateway' });
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
    note.payload = { 'l': link };
  }
  return note;
}

module.exports.sendNotificationToDevice = sendNotificationToDevice;
