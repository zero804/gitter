#!/usr/bin/env node
/*jslint node:true, unused:true */
"use strict";

var userService = require('../../server/services/user-service');
var suggestedRoomService = require('../../server/services/suggested-room-service');
var shutdown = require('shutdown');

var opts = require("nomnom").option('username', {
  position: 0,
  required: true,
  help: "username to look up e.g trevorah"
}).parse();

userService.findByUsername(opts.username)
  .then(suggestedRoomService.getSuggestions)
  .then(function(repos) {
    repos.forEach(function(suggestion) {
      console.log(suggestion.uri, suggestion.room && suggestion.room.users.length, suggestion.score);
    });
  })
  .delay(1000)
  .fail(function(err) {
    console.error(err.stack);
  })
  .fin(function() {
    shutdown.shutdownGracefully();
  });
