'use strict';
var Q = require('q');

var PROVIDERS = [
  require('./redis-token-provider'),
  require('./token-generator')
];

/**
 * Perform the downstream function on the providers in sequence until
 * a result is found. Then, performs the `upstream` function on all the
 * providers upstream of the current provider (so that they can cache the result, etc)

 * NOTE: The upstream operations happen in parallel for improved performance
 */
function iterateProviders(downstream, upstream) {
  return iterateDown(0, downstream, upstream);
}

/* Iterative function used internally by iterateProviders */
function iterateDown(position, downstream, upstream) {
  if(position >= PROVIDERS.length) {
    return null;
  }

  var provider = PROVIDERS[position];
  return downstream(provider)
    .then(function(result) {
      if (result) {
        /* No upstream providers from this one? */
        if (position === 0) return result;

        /* Perform the upstream on all the providers at once */
        return Q.all(PROVIDERS.slice(0, position - 1).map(function(provider) {
            return upstream(result, provider);
          }))
          .thenResolve(result);
      }

      return iterateDown(position + 1, downstream, upstream);
    });
}

/**
 * Find a token for a userId/clientId combination.
 * Returns a promise of a token
 */
exports.getToken = function(userId, clientId) {
  return iterateProviders(function(provider) {
    return provider.getToken(userId, clientId);
  }, function(token, provider) {
    return provider.cacheToken(userId, clientId, token);
  });
};

/**
 * Validate a token and return a promise of [userId, clientId] or null
 */
exports.validateToken = function(token) {
  return iterateProviders(function(provider) {
    return provider.validateToken(token);
  }, function(result, provider) {
    var userId = result[0];
    var clientId = result[0];
    return provider.cacheToken(userId, clientId, token);
  });
};

/**
 * Delete a token, return a promise of nothing
 */
exports.deleteToken = function(token) {
  return Q.all(PROVIDERS.map(function(provider) {
    return provider.deleteToken(token);
  }));
};
