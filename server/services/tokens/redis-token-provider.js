'use strict';

var env    = require('../../utils/env');
var Q      = require('q');
var logger = env.logger;

var redisClient        = env.redis.getClient();
var STANDARD_TTL       = 60;     /* 60 seconds */
var ANONYMOUS_TTL      = 21600;  /* 6 hours */

var tokenLookupCachePrefix = "token:c:";
var tokenValidationCachePrefix = "token:t:";

module.exports = {
  getToken: function(userId, clientId) {
    var key = userId + ':' + clientId;

    var d = Q.defer();
    redisClient.get(tokenLookupCachePrefix + key, function(err, token) {
      if (err) {
        logger.warn('Unable to lookup token in cache ' + err, { exception: err });
        return d.resolve(null);
      }

      return d.resolve(token);
    });

    return d.promise;
  },

  validateToken: function(token) {
    var d = Q.defer();

    redisClient.get(tokenValidationCachePrefix + token, function(err, value) {
      if (err) {
        logger.warn('Unable to lookup token in cache ' + err, { exception: err });
        return d.resolve(null);
      }

      if(!value) return d.resolve(null);

      var parts = ("" + value).split(':');

      return d.resolve([parts[0] || null, parts[1]]);
    });
  },

  cacheToken: function(userId, clientId, token) {
    var key = (userId || "anon") + ':' + clientId;

    var d = Q.defer();
    var multi = redisClient.multi();

    var value = userId + ":" + clientId;

    var cacheTimeout = userId ? STANDARD_TTL : ANONYMOUS_TTL;

    multi.setex(tokenValidationCachePrefix + token, cacheTimeout, value);
    multi.setex(tokenLookupCachePrefix + key, cacheTimeout, token);

    multi.exec(function(err) {
      if (err) {
        logger.warn('Unable to set token lookup in cache ' + err, { exception: err });
      }

      d.resolve();
    });

    return d.promise;
  },

  deleteToken: function(token) {
    return this.validateToken(token)
      .then(function(result) {
        if (!result) return;

        var userId  = result[0];
        var clientId = result[1];

        var d = Q.defer();
        redisClient.del(tokenValidationCachePrefix + token, tokenLookupCachePrefix + (userId || "anon") + ':' + clientId, d.makeNodeResolver());
        return d.promise;
      })
      .catch(function(err) {
        logger.warn('Error while deleting token: ' + err, { exception: err });
      });
  }
};
