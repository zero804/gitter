'use strict';

var Q               = require('q');
var LRU             = require("lru-cache");
var MAX_TOKEN_AGE   = 10 * 1000 * 60 * 60; // 10 minutes
var tokenCache      = LRU({
  max: 2048,
  maxAge: MAX_TOKEN_AGE
});

var userClientCache  = LRU({
  max: 2048,
  maxAge: MAX_TOKEN_AGE
});

module.exports = {
  getToken: function(userId, clientId) {
    if (!userId) return Q.resolve(null);

    return Q.resolve(userClientCache.get(userId + ":" + clientId));
  },

  validateToken: function(token) {
    return Q.resolve(tokenCache.get(token));
  },

  cacheToken: function(userId, clientId, token) {
    tokenCache.set(token, [userId, clientId]);
    if (userId) {
      userClientCache.set(userId + ":" + clientId, token);
    }

    return Q.resolve();
  },

  deleteToken: function(token) {
    var result = tokenCache.get(token);
    if (!result) return Q.resolve();

    tokenCache.del(token);

    var userId = result[0];
    if (!userId) return Q.resolve();

    var clientId = result[1];
    userClientCache.del(userId + ":" + clientId);

    return Q.resolve();
  },

  invalidateCache: function() {
    tokenCache.reset();
    userClientCache.reset();
    return Q.resolve();
  }
};
