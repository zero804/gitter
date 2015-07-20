'use strict';

var env       = require('gitter-web-env');
var redisLock = require("redis-lock")(env.redis.getClient());
var Q         = require("q");

module.exports = function lock(key, promiseFn) {
  var d = Q.defer();

  redisLock(key, function(lockComplete) {
    Q.fcall(promiseFn)
      .then(function(result) {
        /* Unlock on success */
        lockComplete(function() {
          d.resolve(result);
        });
      })
      .catch(function(err) {
        /* Unlock on failure */
        lockComplete(function() {
          d.reject(err);
        });
      })
      .done();
  });

  return d.promise;
};
