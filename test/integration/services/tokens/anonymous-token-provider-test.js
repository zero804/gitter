"use strict";

var testRequire = require('../../test-require');
var anonymousTokenProvider = testRequire('./services/tokens/anonymous-token-provider');
var assert = require('assert');

describe('anonymous-token-provider', function() {


  describe('anonymous', function() {

    it('should not validate invalid tokens', function(done) {
      anonymousTokenProvider.validateToken('$3219128309128301289301283912098312038', function(err, token) {
        if (err) return done(err);
        assert(!token);
        done();
      });
    });

  });
});
