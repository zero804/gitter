#!/usr/bin/env node
/*jslint node: true */
"use strict";

var shutdown = require('shutdown');
var userRemovalService = require('gitter-web-rooms/lib/user-removal-service');

require('../../server/event-listeners').install();

var opts = require('yargs')
  .option('username', {
    alias: 'u',
    required: true,
    description: 'Username of the user to remove',
    string: true
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
