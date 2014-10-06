#!/usr/bin/env node
/*jslint node: true */
"use strict";

var shutdown = require('shutdown');
var userRemovalService = require('../../server/services/user-removal-service');

var winston = require('../../server/utils/winston');

require('../../server/utils/event-listeners').installLocalEventListeners();

var opts = require("nomnom")
   .option('username', {
      abbr: 'u',
      required: true,
      help: 'Username of the user to remove'
   })
   .parse();

require('../../server/services/kue-workers').startWorkers();
require('../../server/utils/event-listeners').installLocalEventListeners();

return userRemovalService.removeByUsername(opts.username)
  .delay(5000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .fail(function(err) {
    console.error('Error: ' + err, err);
    shutdown.shutdownGracefully(1);
  })
  .done();
