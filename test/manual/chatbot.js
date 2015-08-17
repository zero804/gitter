#!/usr/bin/env node
/*jslint node: true, unused:true */
"use strict";

var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var chatService = require('../../server/services/chat-service');

require('../../server/event-listeners').install();

var opts = require("nomnom")
   .option('host', {
      abbr: 'h',
      'default': 'http://localhost:5000'
   })
   .option('user', {
      abbr: 'u',
      required: true
   })
   .option('troupe', {
      abbr: 't'
   })
   .option('frequency', {
      abbr: 'f',
      'default': '10'
   })
   .parse();

function sendMessage(troupe, user) {
  console.log('Sending message');
  return chatService.newChatMessageToTroupe(troupe, user, {
    text: 'The time is ' + new Date()
  });
}

function error(e) {
  console.error('Error');
  console.error(e);
  process.exit(1);
}

userService.findByUsername(opts.user, function(err, user) {
  if(err) return error(err);
  if(!user) return error('User not found');

  troupeService.findByUri(opts.troupe, function(err, troupe) {
    if(err) return error(err);
    if(!troupe) return error('Troupe not found');

    var freq = parseFloat(opts.frequency, 10) * 1000;

    function next() {
      sendMessage(troupe, user)
        .finally(function() {
          setTimeout(next, freq);
        })
        .done();
    }

    setTimeout(next, freq);

  });

});
