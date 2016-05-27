/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after: true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var oauthService = testRequire("./services/oauth-service");
var Promise = require('bluebird');

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var fixture = {};

describe('oauth-service', function() {
  before(fixtureLoader(fixture, {
    user1: { }
  }));

  after(function() {
   fixture.cleanup();
  });

  it('should create tokens', function(done) {

    var userId = mongoUtils.getNewObjectIdString();

    return oauthService.findOrGenerateWebToken(userId)
      .then(function(token) {
        assert(token);
      })
      .nodeify(done);
  });

  // Set to skip until this problematic test can be
  // sorted out. See https://github.com/troupe/gitter-webapp/issues/882
  // AN 25 Jan 2016
  it.skip('should create tokens atomically', function() {

    var userId = mongoUtils.getNewObjectIdString();
    return Promise.all([
      oauthService.findOrGenerateWebToken(userId),
      oauthService.findOrGenerateWebToken(userId),
      oauthService.findOrGenerateWebToken(userId),
      oauthService.findOrGenerateWebToken(userId),
      oauthService.findOrGenerateWebToken(userId),
      ])
      .then(function(results) {
        var tokens = results.map(function(x) {
          return x[0];
        });

        var firstToken = tokens[0];
        assert(firstToken);

        if (!tokens.every(function(token) {
          return token === firstToken;
        })) {
          assert(false, 'The tokens: ' + JSON.stringify(tokens) + ' tokens do not match');
        }
      });
  });

  it('should use cached tokens', function(done) {
    var userId = mongoUtils.getNewObjectIdString();

    return oauthService.findOrGenerateWebToken(userId)
      .spread(function(token1, client) {
        assert(token1);
        assert(client);

        return oauthService.findOrGenerateWebToken(userId)
        .spread(function(token2, client2) {
          assert(token2);
          assert.equal(token1, token2);
          assert.deepEqual(client, client2);
        });
      })
      .nodeify(done);
  });

  it('should use uncached tokens #slow', function(done) {
    this.timeout(20000);

    var users = [mongoUtils.getNewObjectIdString(), mongoUtils.getNewObjectIdString()];
    var clients = [mongoUtils.getNewObjectIdString(), mongoUtils.getNewObjectIdString()];


    function nextClient(userId, tokens, i) {
      if(!i) return Promise.resolve();
      i--;

      var clientId = clients[i];
      return oauthService.findOrCreateToken(userId, clientId)
        .then(function(token) {
          assert(!tokens[token], 'Token is not unique');
          tokens[token] = 1;
          tokens[userId + ':' + clientId] = token;
          return nextClient(userId, tokens, i);
        });
    }

    function nextUser(tokens, i) {
      if(!i) return Promise.resolve();
      i--;
      var userId = users[i];

      return nextClient(userId, tokens, clients.length)
        .then(function() {
          return nextUser(tokens, i);
        });
    }

    var tokens = {};
    return nextUser(tokens, users.length)
      .then(function() {
        assert.strictEqual(Object.keys(tokens).length, 8);
        return oauthService.testOnly.invalidateCache()
          .then(function() {
            var tokens2 = {};
            return nextUser(tokens2, users.length)
              .then(function() {
                assert(Object.keys(tokens).length);
                assert.strictEqual(Object.keys(tokens).length, Object.keys(tokens2).length);

                Object.keys(tokens2).forEach(function(token) {
                  assert(tokens[token]);
                });

                for(var i = 0; i < users.length; i++) {
                  var userId = users[i];
                  for(var j = 0; j < clients.length; j++) {
                    var clientId = clients[j];

                    assert.strictEqual(tokens[userId + ':' + clientId], tokens2[userId + ':' + clientId]);
                  }
                }
              });
            });
      })
      .nodeify(done);

  });


  it('should use validate tokens', function(done) {
    var userId = fixture.user1.id;

    return oauthService.findOrGenerateWebToken(userId)
      .spread(function(token1, client) {
        assert(token1);
        assert.equal('string', typeof token1);
        assert(client);
        assert(client.id);
        assert(client.name);

        return oauthService.validateAccessTokenAndClient(token1)
          .then(function(tokenInfo) {
            assert(tokenInfo);
          });
      })
      .nodeify(done);
  });

  it('should use validate anonymous tokens', function(done) {
    return oauthService.generateAnonWebToken()
      .spread(function(token1, client) {
        assert(token1);
        assert.equal('string', typeof token1);
        assert(client);
        assert(client.id);
        assert(client.name);

        return oauthService.validateAccessTokenAndClient(token1)
          .then(function(tokenInfo) {
            assert(tokenInfo);
          });
      })
      .nodeify(done);
  });

  it('should reuse cached tokens', function(done) {
    var userId = fixture.user1.id;

    return oauthService.findOrGenerateWebToken(userId)
      .spread(function(token1, client) {
        assert(token1);
        assert.equal('string', typeof token1);
        assert(client);
        assert(client.id);
        assert(client.name);

        return oauthService.findOrGenerateWebToken(userId)
          .spread(function(token2, client2) {
            assert.equal(token1, token2);
            assert.deepEqual(client, client2);
          });

      })
      .nodeify(done);
  });


});
