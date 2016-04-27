'use strict';

var env = require('gitter-web-env');
var config = env.config;
var redisClient = env.ioredis.createClient(config.get('redis_caching'), {
  keyPrefix: "perm:"
});

function recordSuccessfulCheck(rateLimitKey, expiry) {
  return redisClient.set(rateLimitKey, '1', 'EX', expiry, 'NX');
}

function checkForRecentSuccess(rateLimitKey) {
  return redisClient.exists(rateLimitKey)
    .then(function(result) {
      return result === 1;
    });
}

module.exports = {
  recordSuccessfulCheck: recordSuccessfulCheck,
  checkForRecentSuccess: checkForRecentSuccess
};
