#!/usr/bin/env node
/*jslint node: true */
"use strict";

var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var presenceService = require('gitter-web-presence');
var shutdown = require('shutdown');
var Promise = require('bluebird');

var opts = require("nomnom").option('username', {
  position: 0,
  required: true,
  help: "username to look up e.g trevorah"
}).parse();

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
