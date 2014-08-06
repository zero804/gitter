#!/usr/bin/env node
/*jslint node: true */
"use strict";

var pushNotificationGateway = require('../../server/gateways/push-notification-gateway');
var winston = require('../../server/utils/winston');
var shutdown = require('shutdown');

var opts = require("nomnom")
  .option('user', {
    abbr: 'u',
    list: true,
    required: true,
    help: 'Send message to userId'
  })
  .option('message', {
    abbr: 'm',
    required: false,
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

var data = null;
if(opts.message || opts.sound || opts.link) {
  data = {
    message: opts.message,
    sound: opts.sound,
    link: opts.link
  };
}

pushNotificationGateway.sendUserNotification(opts.user, data,
  function() {
    setTimeout(function() {
      shutdown.shutdownGracefully();
    });
  });
