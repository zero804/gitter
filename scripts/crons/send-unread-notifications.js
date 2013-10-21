#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var notificationGenerator = require('../../server/services/notifications/email-notification-generator-service');
notificationGenerator(Date.now());
