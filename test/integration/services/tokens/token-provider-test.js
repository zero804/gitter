'use strict';

var testRequire = require('../../test-require');
var tokenProvider = testRequire('./services/tokens/index');
var mongoUtils = testRequire('./utils/mongo-utils');
var assert = require('assert');
var persistenceService = require('gitter-web-persistence');

describe('token-provider', function() {

  require('./provider-tests-common-full')(tokenProvider, true);


  describe('anonymous', function() {
    var clientId;

    beforeEach(function() {
      clientId = mongoUtils.getNewObjectIdString() + "";
    });

    it('should create tokens for user-clients that do not exist', function(done) {
      tokenProvider.getToken(null, clientId, function(err, token) {
        if (err) return done(err);
        assert(token);
        done();
      });
    });

    it('should find tokens that have been cached', function(done) {
      tokenProvider.getToken(null, clientId, function(err, token2) {
        if (err) return done(err);
        assert(token2);
        done();
      });
    });

    it('should not reuse the same tokens', function(done) {
      tokenProvider.getToken(null, clientId, function(err, token2) {
        if (err) return done(err);

        tokenProvider.getToken(null, clientId, function(err, token3) {
          if (err) return done(err);
          assert(token2 != token3);
          done();
        });

      });

    });

    it('should handle legacy persisted tokens during the transition period #slow', function(done) {
      this.timeout(4000);
      return persistenceService.OAuthAccessToken.findOneAndUpdate(
        { userId: null, clientId: clientId },
        {
          $setOnInsert: {
            token: 'test-' + Math.random() + Date.now(),
            clientId: clientId,
            userId: null,
            expires: new Date(Date.now() + 100000)
          }
        },
        { upsert: true, new: true }, function(err, result) {
          if (err) return done(err);

          var token = result.token;
          tokenProvider.validateToken(token, function(err, userClient) {
            if (err) return done(err);

            assert(Array.isArray(userClient));
            // Deep equals freaks out with mongo ids
            assert.strictEqual(null, userClient[0]);
            assert.strictEqual(clientId, "" + userClient[1]);
            done();
          });

        });

    });

  });
});
