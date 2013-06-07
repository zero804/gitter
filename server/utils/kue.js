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

kue._originalCreateQueue = kue.createQueue;

kue.createQueue = function() {
  if(singletonQueue) return singletonQueue;

  singletonQueue = kue._originalCreateQueue();

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

kue.wrapCallback = function(job, callback) {
  return function(err) {
    if(err) winston.error("kue: job failed: " + err, { exception: err, job: job.data });
    callback(err);
  };

};

module.exports = kue;