'use strict';

var env = require('gitter-web-env');
var redisLock = require("redis-lock")(env.redis.getClient());
var Promise = require('bluebird');

module.exports = function lock(key, promiseFn) {
  return new Promise(function(resolve, reject) {

    redisLock(key, function(lockComplete) {
      Promise.try(promiseFn)
        .then(function(result) {
          /* Unlock on success */
          lockComplete(function() {
            resolve(result);
          });
        })
        .catch(function(err) {
          /* Unlock on failure */
          lockComplete(function() {
            reject(err);
          });
        })
        .done();
    });

  });
};
