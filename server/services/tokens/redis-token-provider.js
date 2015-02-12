'use strict';

var env    = require('../../utils/env');
var logger = env.logger;

var redisClient        = env.redis.getClient();
var STANDARD_TTL       = 10 * 60;     /* 10 minutes */
var ANONYMOUS_TTL      = 21600;       /* 6 hours */

var tokenLookupCachePrefix = "token:c:";
var tokenValidationCachePrefix = "token:t:";

module.exports = {
  getToken: function(userId, clientId, callback) {
    if (!userId) return callback();

    redisClient.get(tokenLookupCachePrefix + userId + ":" + clientId, callback);
  },

  validateToken: function(token, callback) {
    redisClient.get(tokenValidationCachePrefix + token, function(err, value) {
      if (err) {
        logger.warn('Unable to lookup token in cache ' + err, { exception: err });
        return callback();
      }

      if(!value) return callback();

      var parts = ("" + value).split(':', 2);

      return callback(null, [parts[0] || null, parts[1]]);
    });
  },

  cacheToken: function(userId, clientId, token, callback) {
    var multi = redisClient.multi();

    var cacheTimeout = userId ? STANDARD_TTL : ANONYMOUS_TTL;

    multi.setex(tokenValidationCachePrefix + token, cacheTimeout, (userId || "") + ":" + clientId);

    if(userId) {
      multi.setex(tokenLookupCachePrefix + userId + ":" + clientId, cacheTimeout, token);
    }

    multi.exec(callback);
  },

  deleteToken: function(token, callback) {
    return this.validateToken(token, function(err, result) {
      if (err) {
        logger.warn('Error while deleting token: ' + err, { exception: err });
        return callback();
      }

      if (!result) return callback();

      var userId  = result[0];
      var clientId = result[1];

      // Anonymous tokens don't have this
      if (!userId) return redisClient.del(tokenValidationCachePrefix + token, callback);

      return redisClient.del(tokenValidationCachePrefix + token, tokenLookupCachePrefix + userId + ":" + clientId, callback);
    });
  },

  invalidateCache: function(callback) {
    redisClient.keys('token:*', function(err, results) {
      if(err) return callback(err);

      if(!results.length) return callback();

      redisClient.del(results, callback);
    });
  }
};
