#!/usr/bin/env node
/*jslint node: true */
"use strict";

var bayeux = require('../../server/web/bayeux');
var winston = require('../../server/utils/winston');
var presenceService = require('../../server/services/presence-service');

presenceService.validateActiveSockets(bayeux.server._server._engine, function() {
  winston.info('Done. Waiting a few seconds.........');

  setTimeout(function() {
    process.exit(0);
  }, 10000);

});
