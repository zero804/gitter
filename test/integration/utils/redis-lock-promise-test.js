/*jslint node:true, unused:true*/
/*global describe:true, it:true */
"use strict";

var assert = require('assert');
var Promise = require('bluebird');
var testRequire = require('../test-require');
var redisLockPromise = testRequire('./utils/redis-lock-promise');

describe('redis-lock-promise', function() {
  it('should act as a mutex', function(done) {
    var count = 0;

    function insideMutex() {
      assert.strictEqual(count, 0);
      count++;
      return Promise.delay(10)
        .then(function() {
          assert.strictEqual(count, 1);
          count--;
        });
    }

    return Promise.all([
      redisLockPromise('x', insideMutex),
      redisLockPromise('x', insideMutex),
      redisLockPromise('x', insideMutex)])
      .nodeify(done);

  });

  it('should handle exceptions', function(done) {
    var count = 0;

    function insideMutex() {
      assert.strictEqual(count, 0);
      count++;
      return Promise.delay(10)
        .then(function() {
          assert.strictEqual(count, 1);
          count--;
          throw new Error('inside-mutex-error');
        });
    }

    return Promise.all([
      redisLockPromise('x', insideMutex),
      redisLockPromise('x', insideMutex),
      redisLockPromise('x', insideMutex)])
      .then(function() {
        assert(false, 'Expected an error');
      }, function(err) {
        if (err.message !== 'inside-mutex-error') throw err;
        /* Otherwise, swallow the error */
      })
      .nodeify(done);

  });
});
