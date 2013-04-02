#!/usr/bin/env node
/*jslint node: true */
"use strict";

var bayeux = require('../../server/web/bayeux');
var winston = require('../../server/utils/winston');
var presenceService = require('../../server/services/presence-service');
var shutdown = require('../../server/utils/shutdown');

presenceService.validateActiveSockets(bayeux.server._server._engine, function(err) {
  if(err) winston.error('Error while validating sockets' + err, { exception: err });

  presenceService.validateActiveUsers(bayeux.server._server._engine, function(err) {
    if(err) winston.error('Error while validating users' + err, { exception: err });

    shutdown.shutdownGracefully();

  });

});

