#!/usr/bin/env node
/*jslint node: true */
"use strict";

var shutdown = require('shutdown');
var userService = require('../../server/services/user-service');

require('../../server/event-listeners').install();

var opts = require('yargs')
  .option('email', {
    alias: 'e',
    required: true,
    description: 'Email of the user to find'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

userService.findAllByEmail(opts.email)
  .delay(5000)
  .then(function(users) {
    if (users.length > 0) {
      console.log('Found ' + users.length + ' users');
      users.forEach(function(user, index) {
        console.log('[' + index + '] ' + user.username);
      })
    }
    else {
      console.log('No user found!');
    }

    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error('Error: ' + err, err);
    shutdown.shutdownGracefully(1);
  })
  .done();
