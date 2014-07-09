/*jslint node: true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

var workerQueue = require('../test-require')('./utils/worker-queue-redis');
var assert = require('assert');
var uuid = require('node-uuid');

describe('redis backed worker queue', function() {
  // queue takes a while to start up
  this.timeout(10000);

  it('should echo data back', function(done) {
    var data = 'test data ' + uuid.v4();

    var queue = workerQueue.queue('test-queue', {}, function() {
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

});
