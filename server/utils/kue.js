/*jshint node:true */
"use strict";

var Queue = require('kue');
var redis = require('./redis');
var winston = require('./winston');
var shutdown = require('./shutdown');

// Override createClient
Queue.redis.createClient = function() {
  return redis.createClient();
};

var singletonQueue = new Queue();

Queue.createQueue = function() {
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


module.exports = Queue;