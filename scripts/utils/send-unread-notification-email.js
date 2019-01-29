#!/usr/bin/env node
/*jslint node:true, unused:true */
'use strict';

var Promise = require('bluebird');
var shutdown = require('shutdown');
var avatars = require('gitter-web-avatars');
var userService = require('gitter-web-users');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var emailNotificationService = require('gitter-web-email-notifications');

var opts = require('yargs')
  .option('username', {
    alias: 'u',
    required: true,
    description: 'username of user to send email to',
    string: true
  })
  .option('room-uri', {
    alias: 'r',
    required: true,
    description: 'A list of rooms to be added.',
    type: 'array'
  })
  .help('help')
  .alias('help', 'h').argv;

Promise.props({
  user: userService.findByUsername(opts.username),
  rooms: troupeService.findByUris(opts.roomUri)
})
  .then(({ user, rooms }) => {
    const roomData = rooms.map(room => {
      const fakeChatMessage = {
        text: 'Test message',
        fromUser: {
          username: 'Some user',
          avatarUrlSmall: avatars.getDefault()
        }
      };

      return {
        troupe: room,
        unreadCount: opts.roomUri.length,
        chats: [fakeChatMessage]
      };
    });

    return emailNotificationService.sendUnreadItemsNotification(user, roomData);
  })
  .then(({ fake }) => {
    console.log(`Using fake mailer? ${fake}`);
  })
  .catch(err => {
    console.log('err', err, err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
