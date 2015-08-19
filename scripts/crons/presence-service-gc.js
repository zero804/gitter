#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston = require('../../server/utils/winston');
var presenceService = require('gitter-web-presence');
var bayeux = require('../../server/web/bayeux');
var shutdown = require('shutdown');

var start = Date.now();

presenceService.collectGarbage(bayeux, function(err) {
  if(err) {
    winston.error('presence-gc failed: ' + err, { exception: err });
  }

  var timeTaken = Date.now() - start;
  winston.info('presence-gc completed in ' + timeTaken + 'ms');
  shutdown.shutdownGracefully(err ? 1 : 0);
});
