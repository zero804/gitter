#!/usr/bin/env node
/*jslint node: true */
"use strict";

var presenceService = require('../../server/services/presence-service');
var userService = require('../../server/services/user-service');
var shutdown = require('../../server/utils/shutdown');

var winston = require('../../server/utils/winston');

var opts = require("nomnom")
   .option('name', {
      abbr: 'n',
      flag: true,
      help: 'Display names'
   })
   .parse();

presenceService.listOnlineUsers(function(err, userIds) {
   if(opts.name) {
      userService.findByIds(userIds, function(err, users) {
         users.forEach(function(user) {
            console.log(user.displayName);
         });

         shutdown.shutdownGracefully();
      });

      return;
   }

   userIds.forEach(function(userId) {
      console.log(userId);
   });
   shutdown.shutdownGracefully();

});