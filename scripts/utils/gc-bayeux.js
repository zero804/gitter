#!/usr/bin/env node
/*jslint node: true */
"use strict";

var bayeux = require('../../server/web/bayeux');
var winston = require('../../server/utils/winston');
var presenceService = require('../../server/services/presence-service');
var shutdown = require('shutdown');

presenceService.collectGarbage(bayeux, function(err) {
  if(err) winston.error('Error while validating sockets' + err, { exception: err });

  shutdown.shutdownGracefully();

});
