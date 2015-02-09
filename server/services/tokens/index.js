'use strict';

var Q      = require('q');
var UpAndDown = require('./up-and-down');

var PROVIDERS = [
  require('./memory-token-provider'),
  require('./redis-token-provider'),
  require('./access-token-provider')
];

var iterator = new UpAndDown(PROVIDERS);

/**
 * Perform the downstream function on the providers in sequence until
 * a result is found. Then, performs the `upstream` function on all the
 * providers upstream of the current provider (so that they can cache the result, etc)
 *
 * NOTE: The upstream operations happen in parallel for improved performance
 *
 * Returns the result from the matching downstream provider
 */
function iterateProviders(downstream, upstream) {
  var d = Q.defer();
  iterator.iterate(downstream, upstream, d.makeNodeResolver());
  return d.promise;
}

/**
 * Find a token for a userId/clientId combination.
 * Returns a promise of a token
 */
exports.getToken = function(userId, clientId, callback) {
  return iterateProviders(function(provider, callback) {
      /* Find the token */
      return provider.getToken(userId, clientId, callback);
    }, function(token, provider, callback) {
      /* Update upstream caches */
      return provider.cacheToken(userId, clientId, token, callback);
    })
    .nodeify(callback);
};

/**
 * Validate a token and return a promise of [userId, clientId] or null
 */
exports.validateToken = function(token, callback) {
  return iterateProviders(function(provider, callback) {
      /* Find the token... */
      return provider.validateToken(token, callback);
    }, function(result, provider, callback) {
      /* Update upstream caches */
      var userId = result[0];
      var clientId = result[0];
      return provider.cacheToken(userId, clientId, token, callback);
    })
    .nodeify(callback);
};

/**
 * Delete a token, return a promise of nothing
 */
exports.deleteToken = function(token, callback) {
  /* Delete the token from all caches simultaneously */
  return Q.all(PROVIDERS.map(function(provider) {
      var d = Q.defer();
      provider.deleteToken(token, d.makeNodeResolver());
      return d.promise;
    }))
    .nodeify(callback);
};


exports.testOnly = {
  invalidateCache: function() {
    /* Invalidate all caches simultaneously */
    return Q.all(PROVIDERS.map(function(provider) {
      var d = Q.defer();
      provider.invalidateCache(d.makeNodeResolver());
      return d.promise;
    }));
  }
};
