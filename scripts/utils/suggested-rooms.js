#!/usr/bin/env node
/*jslint node:true, unused:true */
"use strict";

var userService = require('../../server/services/user-service');
var suggestedRoomService = require('../../server/services/suggested-room-service');
var shutdown = require('shutdown');

var opts = require("nomnom")
  .option('username', {
    position: 0,
    required: true,
    help: "username to look up e.g trevorah"
  })
  .option('language', {
    default: 'en',
    help: "human language"
  })
  .parse();

userService.findByUsername(opts.username)
  .then(function(user) {
    return suggestedRoomService.getSuggestions(user, opts.language);
  })
  .then(function(repos) {
    repos.forEach(function(suggestion) {
      console.log(suggestion.uri, suggestion.score, suggestion.scores);
    });
  })
  .delay(1000)
  .fail(function(err) {
    console.error(err.stack);
  })
  .fin(function() {
    shutdown.shutdownGracefully();
  });
