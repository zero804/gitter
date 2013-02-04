#!/usr/local/bin/node
/*jslint node: true */
"use strict";

var presenceService = require('../../server/services/presence-service');
var userService = require('../../server/services/user-service');

var winston = require('../../server/utils/winston');
/*
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
*/

presenceService.listOnlineUsers(function(err, userIds) {
   userService.findByIds(userIds, function(err, users) {
      users.forEach(function(user) {
         console.log(user.displayName);
      });
      process.exit(0);
   });
});