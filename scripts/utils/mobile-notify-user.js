#!/usr/bin/env node
/*jslint node: true */
"use strict";

var userService = require('../../server/services/user-service');
var assert = require('assert');
var shutdown = require('shutdown');
var pushNotificationGateway = require('../../server/gateways/push-notification-gateway');

var opts = require('yargs').option('username', {
  required: true,
  description: 'username to look up e.g trevorah'
}).help('help')
  .alias('help', 'h')
  .argv;

userService.findByUsername(opts.username)
  .then(function(user) {
    var notification = {
      roomId: '000000000000000000000000',
      roomName: 'fake-room',
      message: 'fake-room \nfake-user: youve got a test push notification!',
      sound: 'notify.caf',
      link: '/mobile/chat#000000000000000000000000'
    };

    return pushNotificationGateway.sendUserNotification(user.id, notification);
  })
  .catch(function(err) {
    console.error(err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
