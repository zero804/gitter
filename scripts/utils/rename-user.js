#!/usr/bin/env node

"use strict";

var shutdown = require('shutdown');
var userService = require('../../server/services/user-service');
var StatusError = require('statuserror');

require('../../server/event-listeners').install();

var opts = require("nomnom")
   .option('old', {
      abbr: 'o',
      required: true,
      help: 'Old username for the user'
   })
   .option('new', {
      abbr: 'n',
      required: true,
      help: 'New username for the user'
   })
   .parse();

userService.findByUsername(opts.old)
  .then(function(user) {
    if (!user) {
      console.log('not found');
      throw new StatusError(404, 'user not found');
    }
    user.username = opts.new;
    return user.save();
  })
  .then(function() {
    console.log('done');
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
