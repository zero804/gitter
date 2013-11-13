#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var notificationGenerator = require('../../server/services/notifications/email-notification-generator-service');
var shutdown = require('../../server/utils/shutdown');

var an_hour_ago = Date.now() - 60 * 60 * 1000;
notificationGenerator(an_hour_ago);

// FIXME pls
setTimeout(shutdown.shutdownGracefully, 30 * 1000);
