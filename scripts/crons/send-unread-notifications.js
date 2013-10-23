#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var notificationGenerator = require('../../server/services/notifications/email-notification-generator-service');
var shutdown = require('../../server/utils/shutdown');

notificationGenerator(Date.now());

// FIXME pls
setTimeout(shutdown.shutdownGracefully, 30 * 1000);
