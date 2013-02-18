/*jshint node:true */
"use strict";

var nconf = require("./config");
var redis = require("redis");

var host = nconf.get("redis:host");
var port = nconf.get("redis:port");

exports.createClient = function createClient() {
  return redis.createClient(port, host);
};