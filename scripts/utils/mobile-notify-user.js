#!/usr/bin/env node
/*jslint node: true */
"use strict";

var userService = require('../../server/services/user-service');
var pushNotificationGateway = require('../../server/gateways/push-notification-gateway');
var iosNotificationGateway = require('../../server/gateways/ios-notification-gateway');
var shutdown = require('shutdown');
var Promise = require('bluebird');

var opts = require('yargs')
  .option('username', {
    description: 'username to look up e.g trevorah'
  })
  .option('appleToken', {
    description: 'token for device'
  })
  .option('deviceType', {
    default: 'APPLE',
    description: 'usually APPLE or APPLE-DEV'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

var notification = {
  roomId: '000000000000000000000000',
  roomName: 'fake-room',
  message: 'fake-room \nfake-user: youve got a test push notification!',
  sound: 'notify.caf',
  link: '/mobile/chat#000000000000000000000000'
};

var promise;

if (opts.username) {
  promise = userService.findByUsername(opts.username)
    .then(function(user) {
      return pushNotificationGateway.sendUserNotification(user.id, notification);
    });
} else if (opts.appleToken) {
  var device = {
    appleToken: opts.appleToken,
    deviceType: opts.deviceType
  };

  promise = iosNotificationGateway.sendNotificationToDevice(notification, 666, device);
} else {
  promise = Promise.try(function() {
    throw new Error('username or appleToken required');
  });
}

promise.catch(function(err) {
    console.error(err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
