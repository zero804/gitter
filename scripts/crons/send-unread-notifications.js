#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var notificationGenerator = require('../../server/services/notifications/email-notification-generator-service');
var shutdown = require('../../server/utils/shutdown');
var opts = require("nomnom")
  .option('age', {
    abbr: 'a',
    default: 60,
    required: false,
    help: 'Age in minutes of the unread items'
  })
  .parse();


var sinceTime = Date.now() - (opts.age * 60 * 1000); //60 * 60 * 1000;

notificationGenerator(sinceTime)
  .then(function() {
    shutdown.shutdownGracefully();
  });
