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

  it('should create tokens atomically', function(done) {
    var userId = mongoUtils.getNewObjectIdString();
    return Q.all([
      oauthService.findOrGenerateWebToken(userId),
      oauthService.findOrGenerateWebToken(userId)
      ])
      .spread(function(r1, r2) {
        var token1 = r1[0];
        var token2 = r2[0];
        assert(token1);
        assert(token2);
        assert.equal(token1, token2);
      })
      .nodeify(done);
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

  it('should use uncached tokens', function(done) {
    var users = [mongoUtils.getNewObjectIdString(), mongoUtils.getNewObjectIdString()];
    var clients = [mongoUtils.getNewObjectIdString(), mongoUtils.getNewObjectIdString()];


    function nextClient(userId, tokens, i, callback) {
      if(!i) return callback();
      i--;

      var clientId = clients[i];
      oauthService.findOrCreateToken(userId, clientId)
        .then(function(token) {
          assert(!tokens[token], 'Token is not unique');
          tokens[token] = 1;
          tokens[userId + ':' + clientId] = token;
          nextClient(userId, tokens, i, callback);
        })
        .done();
    }

    function nextUser(tokens, i, callback) {
      if(!i) return callback();
      i--;
      var userId = users[i];

      nextClient(userId, tokens, clients.length, function(err) {
        if(err) return callback(err);
        nextUser(tokens, i, callback);
      });
    }

    var tokens = {};
    nextUser(tokens, users.length, function(err) {
      if(err) return done(err);

      assert.strictEqual(Object.keys(tokens).length, 8);
      oauthService.testOnly.invalidateCache()
        .then(function() {
          var tokens2 = {};
          nextUser(tokens2, users.length, function(err) {
            if(err) throw err;

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
        })
        .nodeify(done);
    });
  });


  it('should use validate tokens', function(done) {
    var userId = fixture.user1.id;

    return oauthService.findOrGenerateWebToken(userId)
      .spread(function(token1, client) {
        assert(token1);
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
