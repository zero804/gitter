/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env = require('../../utils/env');
var config = env.config;
var _ = require('lodash');
var fetchAllPages = require('./fetch-all-pages');
var logFailingRequest = require('./log-failing-request');
var logRateLimit = require('./log-rate-limit');
var requestWithRetry = require('./request-with-retry');
var publicTokenPool = require('./public-token-pool');
var requestExt = require('request-extensible');
var RequestHttpCache = require('request-http-cache');

function createRedisClient() {
  var redisCachingConfig = config.get("redis_caching");
  var redisConfig = _.extend({}, redisCachingConfig, {
    clientOpts: {
      return_buffers: true
    }
  });

  return env.redis.createClient(redisConfig);
}

var httpRequestCache = new RequestHttpCache({
  backend: 'redis',
  redisClient: createRedisClient()
});

module.exports = requestExt({
  extensions: [
    publicTokenPool,
    fetchAllPages,
    logFailingRequest,
    // httpRequestCache.extension,
    requestWithRetry({ maxRetries: 3 }),
    logRateLimit
  ]
});

/**
 * @deprecated
 */
module.exports.fastRequest = requestExt({
  extensions: [
    publicTokenPool,
    logFailingRequest,
    // httpRequestCache.extension,
    logRateLimit
  ]
});

/**
 * @deprecated
 */
 module.exports.firstPageOnlyRequest = requestExt({
   extensions: [
     publicTokenPool,
     logFailingRequest,
    //  httpRequestCache.extension,
     requestWithRetry({ maxRetries: 3 }),
     logRateLimit
   ]
 });
