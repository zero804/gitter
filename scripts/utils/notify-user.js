#!/usr/local/bin/node
/*jslint node: true */
"use strict";

var pushNotificationGateway = require('../../server/gateways/push-notification-gateway');
var winston = require('../../server/utils/winston');

var opts = require("nomnom")
   .option('user', {
      abbr: 'u',
      list: true,
      required: true,
      help: 'Send message to userId'
   })
   .option('message', {
      abbr: 'm',
      required: true,
      help: 'Message to send'
   })
   .option('sound', {
      abbr: 's',
      help: 'Sound to send'
   })
   .parse();

pushNotificationGateway.sendUserNotification(opts.user, { message: opts.message, sound: opts.sound, payload: { uri: 'txkw2b', page: 'files' } }, function() {
  process.exit();
});
