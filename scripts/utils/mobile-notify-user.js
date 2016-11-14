#!/usr/bin/env node
/*jslint node: true */
"use strict";

var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var chatService = require('../../server/services/chat-service');
var pushNotificationGateway = require('../../server/gateways/push-notification-gateway');
var serializer = require('../../server/serializers/notification-serializer');
var oneToOneRoomService = require('../../server/services/one-to-one-room-service')
var shutdown = require('shutdown');
var Promise = require('bluebird');

var opts = require('yargs')
  .option('username', {
    description: 'username to look up e.g trevorah',
    required: true
  })
  .option('room-uri', {
    description: 'room uri for chat',
  })
  .option('other-user', {
    description: 'Other user',
  })
  .help('help')
  .alias('help', 'h')
  .argv;

var promise;

function findRoom(user, opts) {
  if (opts.roomUri) {
    return troupeService.findByUri(opts.roomUri);
  }

  if (opts.otherUser) {
    return userService.findByUsername(opts.otherUser)
      .then(function(otherUser) {
        return oneToOneRoomService.findOneToOneRoom(user._id, otherUser._id);
      });
  }

  throw new Error('Require either other user or roomUri')
}

if (opts.username) {
  promise = userService.findByUsername(opts.username)
    .bind({})
    .then(function(user) {
      this.user = user;
      return findRoom(user, opts);
    })
    .then(function(room) {
      this.room = room;

      return chatService.findChatMessagesForTroupe(room._id, {
        limit: 2
      });
    })
    .then(function(chats) {
      var troupeStrategy = new serializer.TroupeIdStrategy({ recipientUserId: this.user._id });
      var chatStrategy = new serializer.ChatIdStrategy();

      return [
        serializer.serializeObject(this.room._id, troupeStrategy),
        serializer.serialize(chats.map(function(x) { return x._id; }), chatStrategy),
      ];
    })
    .spread(function(room, chats) {
      var user = this.user;

      return pushNotificationGateway.sendUserNotification('new_chat', user.id, {
        chats: chats,
        room: room,
        hasMentions: false
      });
    });
} else {
  promise = Promise.try(function() {
    throw new Error('username or appleToken required');
  });
}

promise.catch(function(err) {
    console.error(err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
