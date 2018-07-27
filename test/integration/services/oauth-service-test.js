"use strict";

var Promise = require('bluebird');
var testRequire = require('../test-require');
var assert = require('assert');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var oauthService = testRequire('./services/oauth-service');

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('oauth-service', function() {
  var fixture = fixtureLoader.setup({
    user1: { },
    oAuthClientRevoked1: {
      revoked: true
    },
    oAuthAccessTokenRevoked1: {
      user: 'user1',
      client: 'oAuthClientRevoked1'
    }
  });

  it('should create tokens', function() {
    var userId = mongoUtils.getNewObjectIdString();

    return oauthService.findOrGenerateWebToken(userId)
      .then(function(token) {
        assert(token);
      });
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

  it('should use cached tokens', function() {
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
      });
  });

  it('should use uncached tokens #slow', function() {
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
      });
  });


  it('should validate tokens', function() {
    var user = fixture.user1;

    return oauthService.findOrGenerateWebToken(user._id)
      .spread(function(token1, client) {
        assert(token1);
        assert.equal('string', typeof token1);
        assert(client);
        assert(client.id);
        assert(client.name);

        return oauthService.validateAccessTokenAndClient(token1)
          .then(function(tokenInfo) {
            assert(tokenInfo);
            assert(mongoUtils.objectIDsEqual(tokenInfo.user._id, user._id));
            assert(mongoUtils.objectIDsEqual(tokenInfo.client._id, client._id));
          });
      });
  });

  it('should validate anonymous tokens', function() {
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
            assert.equal(tokenInfo.user, null);
            assert(mongoUtils.objectIDsEqual(tokenInfo.client._id, client._id));
          });
      });
  });

  it('should consider a revoked client as an invalid token', function() {
    var token = fixture.oAuthAccessTokenRevoked1.token;

    return oauthService.validateAccessTokenAndClient(token)
      .catch(function(err) {
        assert.equal(err.clientRevoked, true);
      });
  });

  it('should reuse cached tokens', function() {
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

      });
  });

  describe('isInternalClient', function() {
    var FIXTURES = [{
      name: 'null is not an internal client',
      client: null,
      result: false
    }, {
      name: 'invalid client is not an internal client',
      client: { },
      result: false
    }, {
      name: 'an arbitrary client is not internal client',
      client: { clientKey: 'bob', canSkipAuthorization: false },
      result: false
    }, {
      name: 'clients who canSkipAuthorization are internal',
      client: { clientKey: 'bob', canSkipAuthorization: true },
      result: true
    }, {
      name: 'web-internal is internal',
      client: { clientKey: 'web-internal' },
      result: true
    }];

    FIXTURES.forEach(function(meta) {
      it(meta.name, function() {
        var result = oauthService.isInternalClient(meta.client);
        assert.strictEqual(result, meta.result);
      });
    });
  });
});
