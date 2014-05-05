/*jshint node:true, unused:true */
"use strict";

var env = require('./env');

exports.createClient = function createClient() {
  return env.createRedisClient();
};
