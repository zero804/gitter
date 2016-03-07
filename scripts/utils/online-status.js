#!/usr/bin/env node
/*jslint node: true */
"use strict";

var Promise = require('bluebird');
var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var presenceService = require('gitter-web-presence');
var shutdown = require('shutdown');
var shimPositionOption = require('../yargs-shim-position-option');

var opts = require('yargs')
  .option('username', shimPositionOption({
    position: 0,
    required: true,
    description: "username to look up e.g trevorah"
  }))
  .argv;

userService.findByUsername(opts.username)
  .then(function(user) {
    return user._id;
  })
  .then(function(userId) {
    return presenceService.categorizeUsersByOnlineStatus([userId])
      .then(function(statusHash) {
        return !!statusHash[userId];
      });
  })
  .then(function(isOnline) {
    console.log(isOnline ? 'online' : 'offline');
  })
  .catch(function(err) {
    console.error(err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
