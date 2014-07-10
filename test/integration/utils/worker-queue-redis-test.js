/*jslint node: true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

var workerQueue = require('../test-require')('./utils/worker-queue-redis');
var assert = require('assert');
var uuid = require('node-uuid');

describe('worker-queue-redis', function() {
  // queue takes a while to start up
  this.timeout(10000);

  it('should echo data back', function(done) {
    var data = 'test data ' + uuid.v4();

    var queue = workerQueue.queue('worker-queue-redis-test-1', {}, function() {
      return function(result, queuedone) {
        queuedone();

        // there might me some old data, so we wait for ours
        if(result === data) {
          done();
        }
      };
    });

    queue.invoke(data, { delay: 0 }, function() {});

  });

  it('should callback when invoked', function(done) {
    var data = 'test data ' + uuid.v4();

    var queue = workerQueue.queue('worker-queue-redis-test-2', {}, function() {
      return function(result, queuedone) {
        queuedone();
      };
    });

    queue.invoke(data, { delay: 0 }, function() {
      done();
    });

  });

});
