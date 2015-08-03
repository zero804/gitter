#!/usr/bin/env node
/*jslint node: true */
"use strict";

var shutdown = require('shutdown');
var roomDeletionService = require('../../server/services/room-deletion-service');
var troupeService = require('../../server/services/troupe-service');
var Q = require('q');

var winston = require('../../server/utils/winston');

require('../../server/utils/event-listeners').installLocalEventListeners();

var opts = require("nomnom")
   .option('uri', {
      abbr: 'u',
      required: true,
      help: 'Uri of the room to delete'
   })
   .parse();

require('../../server/services/kue-workers').startWorkers();
require('../../server/utils/event-listeners').installLocalEventListeners();

var readline = require('readline');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

return troupeService.findByUri(opts.uri)
  .then(function(room) {
    var d = Q.defer();
    rl.question("Are you sure you want to delete " + room.uri + " with " + room.userCount + " users in it? (yes/no)", function(answer) {
      rl.close();
      console.dir(answer);

      if(answer === 'yes') {
        d.resolve();
      } else {
        d.reject(new Error("Answered no"));
      }
    });

    return d.promise;
  })
  .then(function() {
    return roomDeletionService.removeByUri(opts.uri);
  })
  .delay(5000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error('Error: ' + err, err);
    console.log(err.stack);
    shutdown.shutdownGracefully(1);
  })
  .done();
