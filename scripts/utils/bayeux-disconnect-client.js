#!/usr/bin/env node
/*jslint node: true */
"use strict";

var bayeux = require('../../server/web/bayeux');
var winston = require('../../server/utils/winston');
var presenceService = require('gitter-web-presence');
var shutdown = require('shutdown');

var opts = require("nomnom")
   .option('socketId', {
      abbr: 's',
      required: true,
      help: 'Socket to destroy'
   })
   .parse();

bayeux.destroyClient(opts.socketId, function(err) {
  if(err) winston.error('Error disconnecting socket' + err, { exception: err });

  shutdown.shutdownGracefully();

});
