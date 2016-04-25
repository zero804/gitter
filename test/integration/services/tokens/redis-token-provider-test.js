"use strict";

var testRequire        = require('../../test-require');
var assert             = require('assert');
var redisTokenProvider = testRequire('./services/tokens/redis-token-provider');
var mongoUtils         = require('gitter-web-persistence-utils/lib/mongo-utils');

describe('redis-token-provider', function() {

  require('./provider-tests-common')(redisTokenProvider);

  describe('anonymous', function() {
    var clientId, token;

    beforeEach(function() {
      clientId = mongoUtils.getNewObjectIdString() + "";
      token = "test" + Math.random() + Date.now();
    });

    it('should refresh the expiry on anonymous tokens', function(done) {
      redisTokenProvider.cacheToken(null, clientId, token, function(err) {
        if (err) return done(err);

        redisTokenProvider.testOnly.redisClient.expire(redisTokenProvider.testOnly.tokenValidationCachePrefix + token, 10, function(err) {
          if (err) return done(err);

          redisTokenProvider.validateToken(token, function(err, result) {
            if (err) return done(err);

            assert(result);
            assert(!result[0]);
            assert.strictEqual(clientId, result[1]);

            redisTokenProvider.testOnly.redisClient.ttl(redisTokenProvider.testOnly.tokenValidationCachePrefix + token, function(err, ttl) {
              if(err) return done(err);

              assert(ttl > 10);
              done();

            });

          });

        });

      });

    });
  });


});
