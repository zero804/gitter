#!/usr/bin/env node
'use strict';

// This will clear all unreads and mentions for a given user and room URI

const userService = require('gitter-web-users');
const unreadItemService = require('gitter-web-unread-items');
const troupeService = require('gitter-web-rooms/lib/troupe-service');
const shutdown = require('shutdown');

require('../../server/event-listeners').install();

const opts = require('yargs')
  .option('username', {
    alias: 'u',
    required: true,
    description: 'User you want to remove the unreads/mentions for'
  })
  .option('room-uri', {
    alias: 'r',
    required: true,
    description: 'Room URI where the unread item exists'
  })
  .help('help')
  .alias('help', 'h').argv;

async function exec() {
  const user = await userService.findByUsername(opts.username);
  const room = await troupeService.findByUri(opts.roomUri);

  await unreadItemService.ensureAllItemsRead(user.id, room.id);
}

exec()
  .then(() => {
    console.log('done');
    shutdown.shutdownGracefully();
  })
  .catch(err => {
    console.error(err);
    console.error(err.stack);
    shutdown.shutdownGracefully();
  });
