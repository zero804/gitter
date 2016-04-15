#!/usr/bin/env node
/*jslint node: true */
"use strict";

var env = require('gitter-web-env');
var winston = env.logger;
var shutdown = require('shutdown');
var userRemovalService = require('../../server/services/user-removal-service');

require('../../server/event-listeners').install();

var opts = require('yargs')
  .option('username', {
    alias: 'u',
    required: true,
    description: 'Username of the user to remove'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

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
