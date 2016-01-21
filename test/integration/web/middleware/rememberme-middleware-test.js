/*global describe:true, it:true, before:false, after:false */
'use strict';

var testRequire = require('../../test-require');
var fixtureLoader = require('../../test-fixtures');
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

  it('should generate a token for a user', function(done) {
    rememberMeMiddleware.testOnly.generateAuthToken(fixture.user1.id, function(err, key, token) {
      if(err) return done(err);

      assert(key);
      assert(token);

      done();
    });
  });


  it('should validate a token for a user', function(done) {
    rememberMeMiddleware.testOnly.generateAuthToken(fixture.user1.id, function(err, key, token) {
      if(err) return done(err);

      assert(key);
      assert(token);

      rememberMeMiddleware.testOnly.validateAuthToken(key + ":" + token, function(err, userId) {
        if(err) return done(err);

        assert.strictEqual(userId, fixture.user1.id);

        done();
      });

    });
  });

  it('should validate a token for a user twice in quick succession #slow', function(done) {
    rememberMeMiddleware.testOnly.setTokenGracePeriodMillis(100);

    rememberMeMiddleware.testOnly.generateAuthToken(fixture.user1.id, function(err, key, token) {
      if(err) return done(err);

      assert(key);
      assert(token);

      rememberMeMiddleware.testOnly.validateAuthToken(key + ":" + token, function(err, userId) {
        if(err) return done(err);

        assert.strictEqual(userId, fixture.user1.id);

        rememberMeMiddleware.testOnly.validateAuthToken(key + ":" + token, function(err, userId) {
          if(err) return done(err);

          assert.strictEqual(userId, fixture.user1.id);

          /* Wait for the token to expire */
          setTimeout(function() {
            rememberMeMiddleware.testOnly.validateAuthToken(key + ":" + token, function(err, userId) {
              if(err) return done(err);

              assert(!userId);

              done();
            });
          }, 110);

        });
      });

    });
  });

  it('should delete a token', function(done) {
    rememberMeMiddleware.testOnly.setTokenGracePeriodMillis(100);

    rememberMeMiddleware.testOnly.generateAuthToken(fixture.user1.id, function(err, key, token) {
      if(err) return done(err);

      assert(key);
      assert(token);

      rememberMeMiddleware.testOnly.validateAuthToken(key + ":" + token, function(err, userId) {
        if(err) return done(err);

        assert.strictEqual(userId, fixture.user1.id);

        rememberMeMiddleware.testOnly.deleteAuthToken(key + ":" + token, function(err) {
          if(err) return done(err);

          rememberMeMiddleware.testOnly.validateAuthToken(key + ":" + token, function(err, userId) {
            if(err) return done(err);

            assert(!userId);

            done();
          });

        });
      });

    });
  });

});
