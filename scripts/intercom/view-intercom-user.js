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

var opts = require("nomnom")
   .option('id', {
      required: false
   })
   .option('user_id', {
      required: false
   })
   .option('email', {
      required: false
   })
   .parse();

var client = new Intercom.Client(intercomOptions).usePromises();

if (!opts.id && !opts.user_id && !opts.email) {
  throw new Error("id, user_id or email required.");
}

client.users.find(opts)
  .then(function(response) {
    var user = response.body;
    console.log(user);
  })
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error(err);
    console.error(err.stack);
    shutdown.shutdownGracefully(1);
  });
