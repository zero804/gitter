#!/usr/bin/env node
/*jslint node: true */
"use strict";

var bayeux = require('../../server/web/bayeux');
var winston = require('../../server/utils/winston');
var presenceService = require('../../server/services/presence-service');
var shutdown = require('../../server/utils/shutdown');

var opts = require("nomnom")
   .option('socketId', {
      abbr: 's',
      required: true,
      help: 'Socket to destroy'
   })
   .parse();

bayeux.server._server._engine.destroyClient(opts.socketId, function(err) {
  if(err) winston.error('Error disconnecting socket' + err, { exception: err });

  shutdown.shutdownGracefully();

});

