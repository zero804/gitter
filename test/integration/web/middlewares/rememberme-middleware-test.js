/*global describe:true, it:true, before:false, after:false */
'use strict';

var testRequire = require('../../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

var fixture = {};

var rememberMeMiddleware = testRequire('./web/middlewares/rememberme-middleware');

describe('rememberme-middleware', function() {
  before(fixtureLoader(fixture, {
    user1: { }
  }));

  after(function() {
   fixture.cleanup();
  });

  it('should generate a token for a user', function() {
    return rememberMeMiddleware.testOnly.generateAuthToken(fixture.user1.id)
      .spread(function(key, token) {
        assert(key);
        assert(token);
      });
  });


  it('should validate a token for a user', function() {
    return rememberMeMiddleware.testOnly.generateAuthToken(fixture.user1.id)
      .spread(function(key, token) {
        assert(key);
        assert(token);

        return rememberMeMiddleware.testOnly.validateAuthToken(key + ":" + token);
      })
      .then(function(userId) {
        assert.strictEqual(userId, fixture.user1.id);
      });
  });

  it('should validate a token for a user twice in quick succession #slow', function() {
    rememberMeMiddleware.testOnly.setTokenGracePeriodMillis(100);

    return rememberMeMiddleware.testOnly.generateAuthToken(fixture.user1.id)
      .spread(function(key, token) {
        assert(key);
        assert(token);

        return rememberMeMiddleware.testOnly.validateAuthToken(key + ":" + token)
          .then(function(userId) {
            assert.strictEqual(userId, fixture.user1.id);

            return rememberMeMiddleware.testOnly.validateAuthToken(key + ":" + token);
          })
          .then(function(userId) {
            assert.strictEqual(userId, fixture.user1.id);
          })
          .delay(110) /* Wait for the token to expire */
          .then(function() {
            return rememberMeMiddleware.testOnly.validateAuthToken(key + ":" + token);
          })
          .then(function(userId) {
            assert(!userId);
          });
      });

  });

  it('should delete a token', function() {
    rememberMeMiddleware.testOnly.setTokenGracePeriodMillis(100);

    return rememberMeMiddleware.testOnly.generateAuthToken(fixture.user1.id)
      .spread(function(key, token) {
        assert(key);
        assert(token);

        return rememberMeMiddleware.testOnly.validateAuthToken(key + ":" + token)
          .then(function(userId) {
            assert.strictEqual(userId, fixture.user1.id);

            return rememberMeMiddleware.testOnly.deleteAuthToken(key + ":" + token);
          })
          .then(function() {
            return rememberMeMiddleware.testOnly.validateAuthToken(key + ":" + token);
          })
          .then(function(userId) {
            assert(!userId);
          });
        });
  });

  it('should handle bad keys', function() {
    return rememberMeMiddleware.testOnly.validateAuthToken("12312123123123123123123123:123123123123123123123123132123")
      .then(function(userId) {
        assert(!userId);
      });
  })

});
