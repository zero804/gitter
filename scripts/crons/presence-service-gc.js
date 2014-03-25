#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston = require('../../server/utils/winston');
var presenceService = require('../../server/services/presence-service');
var bayeux = require('../../server/web/bayeux');

var start = Date.now();

var engine = bayeux.engine;
presenceService.collectGarbage(engine, function(err) {
  if(err) {
    winston.error('presence-gc failed: ' + err, { exception: err });
  }

  var timeTaken = Date.now() - start;
  winston.info('presence-gc completed in ' + timeTaken + 'ms');
  shutdown.shutdownGracefully(err ? 1 : 0);
});

var shutdown = require('../../server/utils/shutdown');

