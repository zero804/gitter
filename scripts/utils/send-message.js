#!/usr/bin/env node
/*jslint node:true, unused:true */
"use strict";

var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var chatService = require('../../server/services/chat-service');

require('../../server/event-listeners').install();
var Promise = require('bluebird');

var shutdown = require('shutdown');

var opts = require("nomnom")
  .option('uri', {
    help: "uri of room to list presence for"
  })
  .option('fromUser', {
    help: "id of room to list presence for"
  })
  .option('toUser', {
    help: "id of room to list presence for"
  })
  .parse();

function getTroupe(fromUser) {
  if (opts.uri)
    return troupeService.findByUri(opts.uri);

  if (!opts.toUser) {
    return Promise.reject(new Error('Please specify either a uri or a fromUser and toUser'));
  }

  return userService.findByUsername(opts.toUser)
  .then(function(toUser) {
    if (!toUser) throw new Error('User ' + opts.toUser + ' not found');

    return troupeService.findOneToOneTroupe(fromUser._id, toUser._id);
  });

}

userService.findByUsername(opts.fromUser)
  .then(function(fromUser) {
    if (!fromUser) throw new Error('User ' + opts.fromUser + ' not found');

    return [fromUser, getTroupe(fromUser)];
  })
  .spread(function(fromUser, troupe) {
    if (!troupe) throw new Error('Room not found');
    return chatService.newChatMessageToTroupe(troupe, fromUser, { text: 'test message' });
  })
  .then(function(result) {
    console.log(result);
  })
  .delay(10000)
  .catch(function(err) {
    console.error(err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
