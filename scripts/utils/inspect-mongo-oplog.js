#!/usr/bin/env node
/*jslint node: true */
"use strict";

var shutdown = require('shutdown');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var persistence = require('gitter-web-persistence');

require('../../server/event-listeners').install();

var opts = require('yargs')
  .option('timestamp', {
    alias: 'u',
    required: true,
    description: 'Username of the user to remove'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

var operationMap = {};

persistence.Oplog.find({
  _id: { $gt: mongoUtils.createIdForTimestampString(opts.timestamp) },
})
  .then(function(messages) {
    messages.forEach(function(message) {
      operationMap[message.ns] = (operationMap[message.ns] || {});

      operationMap[message.ns][message.op] = (operationMap[message.ns][message.op] || 0) + 1;
    });

    console.log(operationMap);
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
