"use strict";

var env = require('gitter-web-env');
var config = env.config;

var _ = require('lodash');
var shutdown = require('shutdown');

var Intercom = require('intercom-client');
var intercomOptions = {
  appId: config.get("stats:intercom:app_id"),
  appApiKey: config.get("stats:intercom:key")
};

var IntercomStream = require('../../server/utils/intercom-stream');

var opts = require("nomnom")
   .option('segment', {
      abbr: 's',
      required: true,
      help: 'Id of the segment to list'
   })
   .parse();

var client = new Intercom.Client(intercomOptions).usePromises();
var stream = new IntercomStream({ client: client, key: 'users'}, function() {
  return client.users.listBy({segment_id: opts.segment});
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
