#!/usr/bin/env node
/*jslint node: true */
"use strict";

var pushNotificationGateway = require('../../server/gateways/push-notification-gateway');
var winston = require('../../server/utils/winston');
var shutdown = require('../../server/utils/shutdown');

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
   .option('link', {
      abbr: 'l',
      required: false,
      help: 'Link'
   })

   .option('sound', {
      abbr: 's',
      help: 'Sound to send'
   })
   .parse();

pushNotificationGateway.sendUserNotification(opts.user, {
   message: opts.message,
   sound: opts.sound,
   link: opts.link,
   payload: { uri: 'txkw2b', page: 'files' } },
   function() {
     shutdown.shutdownGracefully();
   });