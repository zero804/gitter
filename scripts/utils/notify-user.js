#!/usr/bin/env node
/*jslint node: true */
"use strict";

var appEvents = require('../../server/app-events');
var userService = require('../../server/services/user-service');

var winston = require('../../server/utils/winston');

var opts = require("nomnom")
   .option('user', {
      abbr: 'u',
      list: true,
      required: false,
      help: 'Send message to userId'
   })
   .option('email', {
      abbr: 'e',
      list: true,
      required: false,
      help: 'Send message to email address'
   })
   .option('message', {
      abbr: 'm',
      required: true,
      help: 'Message to send'
   })
   .option('title', {
      abbr: 'd',
      required: true,
      help: 'Title'
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


if(opts.user) {
   appEvents.userNotification({
    userId: opts.user,
    title: opts.title,
    text: opts.text,
    link: opts.link,
    sound: opts.sound
   });

} else {
   if(!opts.email) { winston.error("Either a userId or email address is requireId"); process.exit(1); }
   userService.findByEmail("" + opts.email, function(err, user) {
      if(err) { winston.error("Error", err); process.exit(1); }
      if(!user) { winston.error("No user with email address" + opts.email); process.exit(1); }

      appEvents.userNotification({
       userId: user.id,
       title: opts.title,
       text: opts.message,
       link: opts.link,
       sound: opts.sound
      });

      process.nextTick(function() {
        process.exit(0);
      });

   });
}