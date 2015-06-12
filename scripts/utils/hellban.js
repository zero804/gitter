#!/usr/bin/env node
/*jslint node: true */
"use strict";

var userService = require('../../server/services/user-service');
var shutdown = require('shutdown');

var opts = require("nomnom")
  .option('username', {
    position: 0,
    required: true,
    help: "username to hellban e.g trevorah"
  })
 .option('unban', {
    abbr: 'u',
    flag: true,
    help: 'unban user from hell'
  }).parse();

var banned = !opts.unban;

userService.findByUsername(opts.username)
  .then(function(user) {
    user.hellbanned = banned;
    return user.saveQ();
  })
  .delay(5000)
  .then(function() {
    var action = banned ? 'banned to a special kind of hell' : 'redeemed to walk amongst us again';
    console.log(opts.username, 'has been', action);
  })
  .fail(function(err) {
    console.error(err.stack);
  })
  .fin(function() {
    shutdown.shutdownGracefully();
  });