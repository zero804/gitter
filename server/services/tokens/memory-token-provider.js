'use strict';

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
  getToken: function(userId, clientId, callback) {
    console.log('ARGUMMENTS', arguments);
    if (!userId) return callback();

    return callback(null, userClientCache.get(userId + ":" + clientId));
  },

  validateToken: function(token, callback) {
    return callback(null, tokenCache.get(token));
  },

  cacheToken: function(userId, clientId, token, callback) {
    tokenCache.set(token, [userId, clientId]);
    if (userId) {
      userClientCache.set(userId + ":" + clientId, token);
    }
    return callback();
  },

  deleteToken: function(token, callback) {
    var result = tokenCache.get(token);
    if (!result) return callback();

    tokenCache.del(token);

    var userId = result[0];
    if (!userId) return callback();

    var clientId = result[1];
    userClientCache.del(userId + ":" + clientId);

    return callback();
  },

  invalidateCache: function(callback) {
    tokenCache.reset();
    userClientCache.reset();
    return callback();
  }
};
