/*jshint node:true */
"use strict";

var kue = require('kue');
var redis = require('./redis');

// Override createClient
kue.redis.createClient = function() {
  return redis.createClient();
};

module.exports = kue;