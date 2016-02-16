#!/usr/bin/env node
/*jslint node: true */
"use strict";

var shutdown = require('shutdown');
var userRemovalService = require('../../server/services/user-removal-service');

var winston = require('../../server/utils/winston');

require('../../server/event-listeners').install();

var opts = require("nomnom")
   .option('username', {
      abbr: 'u',
      required: true,
      help: 'Username of the user to remove'
   })
   .parse();

userRemovalService.removeByUsername(opts.username)
  .delay(5000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error('Error: ' + err, err);
    shutdown.shutdownGracefully(1);
  })
  .done();
