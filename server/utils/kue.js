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

var singletonQueue;

var _createQueue = kue.createQueue;

kue.createQueue = function() {
  console.dir("Creating kue queue");
  console.error(new Error().stack);

  if(singletonQueue) return singletonQueue;

  singletonQueue = _createQueue();
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

  return singletonQueue;
};


module.exports = kue;