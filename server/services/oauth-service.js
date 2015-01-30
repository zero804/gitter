"use strict";

var WEB_INTERNAL_CLIENT_KEY = 'web-internal';

var env    = require('../utils/env');
var stats  = env.stats;
var nconf  = env.config;
var logger = env.logger;

var redisClient        = env.redis.getClient();

var persistenceService = require("./persistence-service");
var random             = require('../utils/random');
var Q                  = require('q');
var userService        = require('./user-service');
var moment             = require('moment');

var ircClientId;

var cacheTimeout = 60; /* 60 seconds */

/* Load webInternalClientId once */
var webClientPromise = persistenceService.OAuthClient.findOneQ({ clientKey: WEB_INTERNAL_CLIENT_KEY })
    .then(function(oauthClient) {
      if(!oauthClient) throw new Error("Unable to load internal client id.");
      oauthClient = oauthClient.toJSON();
      oauthClient.id = oauthClient._id && oauthClient._id.toString();

      return oauthClient;
    });

function loadIrcClientId() {
  if(ircClientId) return Q.resolve(ircClientId);

  /* Load ircClientId once */
  return persistenceService.OAuthClient.findOneQ({ clientKey: nconf.get('irc:clientKey') })
    .then(function(oauthClient) {
      if(!oauthClient) throw new Error("Unable to load IRC client id.");

      ircClientId = oauthClient._id;
      return ircClientId;
    });
}

var tokenLookupCachePrefix = "token:c:";
var tokenLookupCache = {
  get: function(userId, clientId) {
    var d = Q.defer();
    redisClient.get(tokenLookupCachePrefix + userId + ':' + clientId, d.makeNodeResolver());
    return d.promise.catch(function(err) {
      logger.warn('Unable to lookup token in cache ' + err, { exception: err });
    });
  },

  set: function(userId, clientId, token) {
    var d = Q.defer();
    redisClient.setex(tokenLookupCachePrefix + userId + ':' + clientId, cacheTimeout, token, d.makeNodeResolver());
    return d.promise.catch(function(err) {
      logger.warn('Unable to set token lookup in cache ' + err, { exception: err });
    });
  }
};

var tokenValidationCachePrefix = "token:t:";
var tokenValidationCache = {
  get: function(token) {
    var d = Q.defer();
    redisClient.get(tokenValidationCachePrefix + token, d.makeNodeResolver());
    return d.promise
      .then(function(value) {
        if(!value) return;
        var parts = ("" + value).split(':');

        return { userId: parts[0] || null, clientId: parts[1] };
      })
      .catch(function(err) {
        logger.warn('Unable to lookup token in cache ' + err, { exception: err });
      });
  },

  set: function(token, userId, clientId) {
    /* NB: userId can be null! */
    if(!userId) userId = '';

    var d = Q.defer();
    var value = userId + ":" + clientId;
    redisClient.setex(tokenValidationCachePrefix + token, cacheTimeout, value, d.makeNodeResolver());
    return d.promise.catch(function(err) {
      logger.warn('Unable to set token lookup in cache ' + err, { exception: err });
    });
  }
};

exports.findClientById = function(id, callback) {
  persistenceService.OAuthClient.findById(id, callback);
};

// this is called when a user actively logs in via oauth
exports.saveAuthorizationCode = function(code, client, redirectUri, user, callback) {
  var authCode = new persistenceService.OAuthCode({
      code: code,
      clientId: client.id,
      redirectUri: redirectUri,
      userId: user.id
  });
  authCode.save(callback);
};

exports.findAuthorizationCode = function(code, callback) {
  persistenceService.OAuthCode.findOne({ code: code }, callback);
};

/**
 * Turn a token into a user/token/client.
 *
 * Returns { user / client / accessToken } hash. If the token is for an anonymous user,
 * user is null;
 */
exports.validateAccessTokenAndClient = function(token, callback) {
  return tokenValidationCache.get(token)
    .then(function(cachedInfo) {
      if(cachedInfo) {
        return cachedInfo;
      }

      return persistenceService.OAuthAccessToken.findOneQ({ token: token })
        .then(function(accessToken) {
          if(!accessToken) return;

          /* Cache this result */
          return tokenValidationCache.set(token, accessToken.userId, accessToken.clientId)
            .thenResolve(accessToken);
        });
    })
    .then(function(accessToken) {
      if(!accessToken) {
        logger.warn('Invalid token presented: ', { token: token });
        return null;
      }

      var clientId = accessToken.clientId;
      if(!clientId) {
        logger.warn('Invalid token presented (no client): ', { token: token });
        return null; // code invalid
      }

      var userId = accessToken.userId;   // userId CAN be null

      // TODO: check for expired tokens!!

      return Q.all([
          persistenceService.OAuthClient.findByIdQ(clientId),
          userId && userService.findById(userId)
        ])
        .spread(function(client, user) {
          if(!client) {
            logger.warn('Invalid token presented (client not found): ', { token: token });
            return null;
          }

          if(userId && !user) {
           logger.warn('Invalid token presented (user not found): ', { token: token });
           return null;
          }

          return { user: user, client: client };
        });

    })
    .nodeify(callback);
};



exports.removeAllAccessTokensForUser = function(userId, callback) {
  return persistenceService.OAuthAccessToken.removeQ({ userId: userId })
    .nodeify(callback);
};

exports.findClientByClientKey = function(clientKey, callback) {
  persistenceService.OAuthClient.findOne({ clientKey: clientKey }, callback);
};

function findOrCreateToken(userId, clientId, callback) {
  if(!userId) return Q.reject('userId required').nodeify(callback);
  if(!clientId) return Q.reject('clientId required').nodeify(callback);

  return tokenLookupCache.get(userId, clientId)
    .then(function(token) {
      /* Cached okay? */
      if(token) return token;

      /* Lookup and possible create */
      return persistenceService.OAuthAccessToken.findOneQ({
          userId: userId,
          clientId: clientId
        }).then(function(oauthAccessToken) {
          if(oauthAccessToken) {
            return tokenLookupCache.set(userId, clientId, oauthAccessToken.token)
              .thenResolve(oauthAccessToken.token);
          }

          return random.generateToken()
            .then(function(token) {
              return persistenceService.OAuthAccessToken.findOneAndUpdateQ(
                { userId: userId, clientId: clientId },
                {
                  $setOnInsert: {
                    token: token
                  }
                },
                {
                  upsert: true
                }).then(function(result) {
                  return tokenLookupCache.set(userId, clientId, result.token)
                    .thenResolve(result.token);
                });
              });
            });

    })
    .nodeify(callback);
}
exports.findOrCreateToken = findOrCreateToken;

// TODO: move some of this functionality into redis for speed
// TODO: make the web tokens expire
exports.findOrGenerateWebToken = function(userId, callback) {
  return webClientPromise
    .then(function(client) {
      return Q.all([findOrCreateToken(userId, client.id), client]);
    })
    .nodeify(callback);
};

exports.generateAnonWebToken = function(callback) {
  return Q.all([
      webClientPromise,
      random.generateToken()
    ])
    .spread(function(client, token) {
      return persistenceService.OAuthAccessToken.createQ({
          token: token,
          userId: null,
          clientId: client.id,
          expires: moment().add('days', 7).toDate()
        })
        .thenResolve([token, client]);
    })
    .nodeify(callback);
};

exports.findOrGenerateIRCToken = function(userId, callback) {
  return loadIrcClientId()
    .then(function(clientId) {
      return findOrCreateToken(userId, clientId);
    })
    .nodeify(callback);
};

exports.testOnly = {
  invalidateCache: function() {
    var d = Q.defer();
    redisClient.keys(tokenValidationCachePrefix + '*', function(err, results) {
      if(err) return d.reject(err);

      if(!results.length) return d.resolve();

      redisClient.del(results, function(err) {
        if(err) return d.reject(err);

        d.resolve();
      });
    });

    return d.promise;
  }
};

