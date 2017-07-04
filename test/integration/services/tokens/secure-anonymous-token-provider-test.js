"use strict";

var testRequire = require('../../test-require');
var secureAnonymousTokenProvider = testRequire('./services/tokens/secure-anonymous-token-provider');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var assert = require('assert');

describe('secure-anonymous-token-provider', function() {


  describe('anonymous', function() {
    var clientId;

    beforeEach(function() {
      clientId = mongoUtils.getNewObjectIdString() + "";
    });

    it('should not validate invalid tokens', function(done) {
      secureAnonymousTokenProvider.validateToken('$3219128309128301289301283912098312038', function(err, token) {
        if (err) return done(err);
        assert(!token);
        done();
      });
    });

    it('should generate tokens', function(done) {
      return secureAnonymousTokenProvider.getToken(null, clientId, function(err, token) {
        if (err) return done(err);
        assert(token);
        assert(token.length > 30)

        secureAnonymousTokenProvider.validateToken(token, function(err, pair) {
          if (err) return done(err);

          var _userId = pair[0]
          var _clientId = pair[1];

          assert.strictEqual(_userId, null);
          assert.strictEqual(_clientId, clientId);

          done();
        });
      })
    });


    it('should find tokens that have been cached', function(done) {
      secureAnonymousTokenProvider.getToken(null, clientId, function(err,token) {
        if (err) return done(err);
        secureAnonymousTokenProvider.validateToken(token, function(err, userClient) {
          if (err) return done(err);

          assert(Array.isArray(userClient));
          // Deep equals freaks out with mongo ids
          assert.strictEqual(null, userClient[0]);
          assert.strictEqual(clientId, userClient[1]);
          done();
        });
      });
    });

  });
});
