#!/usr/bin/env node
/*jslint node: true, unused:true */
"use strict";

var shutdown = require('shutdown');

require('../../server/utils/event-listeners').installLocalEventListeners();

var opts = require("nomnom")
   .option('socketId', {
      abbr: 's',
      required: true,
      help: 'socketId'
   })
   .parse();

var presenceService = require('../../server/services/presence-service');
presenceService.getSocket(opts.socketId, function() {
  console.log(arguments);
  process.nextTick(function() {
  shutdown.shutdownGracefully();
  });
});
