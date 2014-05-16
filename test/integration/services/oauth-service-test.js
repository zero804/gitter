/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after: true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var mongoUtils = testRequire('./utils/mongo-utils');
var oauthService = testRequire("./services/oauth-service");
var Q = require('q');

var fixtureLoader = require('../test-fixtures');
var fixture = {};

before(fixtureLoader(fixture, {
  user1: { }
}));

after(function() {
 fixture.cleanup();
});


describe('oauth-service', function() {
  it('should create tokens', function(done) {

    var userId = mongoUtils.getNewObjectIdString();

    return oauthService.findOrGenerateWebToken(userId)
      .then(function(token) {
        assert(token);
      })
      .nodeify(done);
  });

  it('should create tokens atomically', function(done) {
    var userId = mongoUtils.getNewObjectIdString();
    return Q.all([
      oauthService.findOrGenerateWebToken(userId),
      oauthService.findOrGenerateWebToken(userId)
      ])
      .spread(function(token1, token2) {
        assert(token1);
        assert(token2);
        assert.equal(token1, token2);
      })
      .nodeify(done);
  });

  it('should use cached tokens', function(done) {
    var userId = mongoUtils.getNewObjectIdString();

    return oauthService.findOrGenerateWebToken(userId)
      .then(function(token1) {
        assert(token1);
        return oauthService.findOrGenerateWebToken(userId)
        .then(function(token2) {
          assert(token2);
          assert.equal(token1, token2);
        });
      })
      .nodeify(done);
  });


  it('should use validate tokens', function(done) {
    var userId = fixture.user1.id;

    return oauthService.findOrGenerateWebToken(userId)
      .then(function(token1) {
        assert(token1);

        return oauthService.validateAccessTokenAndClient(token1)
          .then(function(tokenInfo) {
            assert(tokenInfo);
          });
      })
      .nodeify(done);
  });


});