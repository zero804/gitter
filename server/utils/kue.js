/*jshint node:true */
"use strict";

var kue = require('kue');
var redis = require('./redis');
var winston = require('./winston');
var shutdown = require('./shutdown');

// Override createClient
kue.redis.createClient = function() {
  return redis.createClient();
};

var singletonQueue = kue.createQueue();

kue.createQueue = function() {
  return singletonQueue;
};

shutdown.addHandler('kue', 10, function(callback) {
  winston.info('Attempting to shutdown kue handlers');

  singletonQueue.shutdown(function(err) {
    if(err) {
      winston.error("Error while shutting down kue", { exception: err });
    } else {
      winston.info('kue shutdown completed.');
    }

    callback();
  }, 25000);
});


module.exports = kue;