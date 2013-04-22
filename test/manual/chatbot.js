#!/usr/bin/env node
/*jslint node: true */
"use strict";

var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var oauthService = require('../../server/services/oauth-service');
var rest = require('restler');

var opts = require("nomnom")
   .option('host', {
      abbr: 'h',
      'default': 'http://localhost:5000'
   })
   .option('user', {
      abbr: 'u',
      'default': 'testuser@troupetest.local'
   })
   .option('troupe', {
      abbr: 't',
      'default': 'testtroupe1'
   })
   .option('frequency', {
      abbr: 'f',
      'default': '10'
   })
   .parse();

function sendMessage(token, troupe, host) {
  var url = host + '/troupes/' + troupe + '/chatMessages';
  console.log('Chatting to ' + url);
  rest.post(url, {
    data: { text: 'The time is ' + new Date() },
    headers: {
      'Authorization': 'Bearer ' + token
    }
  }).on('complete', function(data, response) {
    console.log('Done');
  });
}

function error(e) {
  console.error(e);
  process.exit(1);
}

userService.findByEmail(opts.user, function(err, user) {
  if(err) return error(err);
  if(!user) return error('User not found');

  troupeService.findByUri(opts.troupe, function(err, troupe) {
    if(err) return error(err);
    if(!troupe) return error('Troupe not found');

    oauthService.findOrGenerateWebToken(user.id, function(err, token) {
      if(err) return error(err);
      if(!token) return error('Token not found');

      setInterval(function() {
        sendMessage(token, troupe.id, opts.host);
      }, parseInt(opts.frequency, 10) * 1000);
    });

  });

});

