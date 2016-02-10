#!/usr/bin/env node
/*jslint node: true */
"use strict";

var troupeService = require('../../server/services/troupe-service');
var persistance = require('../../server/services/persistence-service');
var Promise = require('bluebird');
var assert = require('assert');
var shutdown = require('shutdown');

var opts = require("nomnom")
  .option('from', {
    abbr: 'f',
    required: true,
    help: 'Room to take messages from'
  })
  .option('to', {
    abbr: 't',
    required: true,
    help: 'Room to migrate messages to'
  })
  .parse();

Promise.all([
  troupeService.findByUri(opts.from),
  troupeService.findByUri(opts.to)
])
.spread(function(fromRoom, toRoom) {
  assert(fromRoom && fromRoom.id, 'lookup failed for ' + opts.from);
  assert(toRoom && fromRoom.id, 'lookup failed for ' + opts.to);

  return persistance.ChatMessage.update({ toTroupeId: fromRoom.id }, { $set: { toTroupeId: toRoom.id } }, { multi: true })
    .exec();
})
.delay(5000)
.then(function() {
  shutdown.shutdownGracefully();
})
.catch(function(err) {
  console.error('Error: ' + err, err);
  shutdown.shutdownGracefully(1);
})
.done();
