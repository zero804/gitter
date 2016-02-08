#!/usr/bin/env node
"use strict";

var _ = require('lodash');
var shutdown = require('shutdown');
var intercom = require('gitter-web-intercom');
var getIntercomStream = require('intercom-stream');


var opts = require("nomnom")
   .option('segment', {
      abbr: 's',
      required: true,
      help: 'Id of the segment to list'
   })
   .parse();

var stream = getIntercomStream({ client: intercom.client, key: 'users'}, function() {
  return intercom.client.users.listBy({segment_id: opts.segment});
});

stream
  .on('data', function(user) {
    console.log(user);
  })
  .on('end', function() {
    console.log('done');
    shutdown.shutdownGracefully();
  })
  .on('error', function die(error) {
    console.error(error);
    console.error(error.stack);
    shutdown.shutdownGracefully();
  });
