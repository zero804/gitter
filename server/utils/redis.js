/*jshint node:true, unused:true */
"use strict";

var env = require('./env');

/* Wrapper to gitter-env */
exports.getClient = function() {
  return env.redis.getClient();
};

exports.createClient = function() {
  return env.redis.createClient();
};

exports.quit = function(client) {
  return env.redis.quitClient(client);
};

