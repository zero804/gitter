#!/usr/bin/env node

"use strict";

var winston = require('../../server/utils/winston');
var presenceService = require('gitter-web-presence');
var BayeuxCluster = require('../../server/web/bayeux/cluster');
var shutdown = require('shutdown');

var start = Date.now();

var bayeux = new BayeuxCluster(true); // Lightweight bayeux cluster

presenceService.collectGarbage(bayeux, function(err) {
  if(err) {
    winston.error('presence-gc failed: ' + err, { exception: err });
  }

  var timeTaken = Date.now() - start;
  winston.info('presence-gc completed in ' + timeTaken + 'ms');
  shutdown.shutdownGracefully(err ? 1 : 0);
});
