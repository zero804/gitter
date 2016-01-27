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

var client = new Intercom.Client(intercomOptions).usePromises();
var stream = new IntercomStream({ client: client, key: 'segments'}, function() {
  return client.segments.list()
});

stream
  .on('data', function(segment) {
    console.log(segment.id, segment.name);
  })
  .on('end', function() {
    shutdown.shutdownGracefully();
  })
  .on('error', function die(error) {
    console.error(error);
    console.error(error.stack);
    shutdown.shutdownGracefully();
  });



