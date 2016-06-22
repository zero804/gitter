"use strict";

var env = require('gitter-web-env');
var logger = env.logger;
var nconf = env.config;
var stats = env.stats;

var _ = require('lodash');
var uuid = require('node-uuid');
var sechash = require('sechash');
var userService = require('../../services/user-service');
var useragentTagger = require('../user-agent-tagger');
var debug = require('debug')('gitter:infra:rememberme-middleware');
var userScopes = require('gitter-web-identity/lib/user-scopes');
var passportLogin = require('../passport-login');
var Promise = require('bluebird');

var cookieName = nconf.get('web:cookiePrefix') + 'auth';
var cookieDomain = nconf.get("web:cookieDomain");
var cookieSecure = nconf.get("web:secureCookies");
var timeToLiveDays = nconf.get("web:rememberMeTTLDays");

var redisClient = env.redis.getClient();

var tokenGracePeriodMillis = 5000; /* How long after a token has been used can you reuse it? */

var REMEMBER_ME_PREFIX = "rememberme:";

/**
 * Generate an auth token for a user and save it in redis
 */
function generateAuthToken(userId) {
  debug('Generate auth token: userId=%s', userId);
  var key = uuid.v4();
  var token = uuid.v4();

  return Promise.fromCallback(function(callback) {
      return sechash.strongHash('sha512', token, callback);
    })
    .then(function(hash3) {
      var json = JSON.stringify({ userId: userId, hash: hash3 });

      /* The server doesn't keep a copy of the token anywhere, only the hash */
      return Promise.fromCallback(function(callback) {
        redisClient.setex(REMEMBER_ME_PREFIX + key, 60 * 60 * 24 * timeToLiveDays, json, callback);
      });
    })
    .return(key + ":" + token);
}

/**
 * Delete a token
 */
var deleteAuthToken = Promise.method(function(authCookieValue) {
  debug('Delete auth token: token=%s', authCookieValue);

  /* Auth cookie */
  if(!authCookieValue) return;

  var authToken = authCookieValue.split(":", 2);
  if(authToken.length !== 2) return;

  var key = authToken[0];

  if(!key) return;

  debug('Deleting rememberme token %s', key);

  var redisKey = "rememberme:" + key;

  return Promise.fromCallback(function(callback) {
    redisClient.del(redisKey, callback);
  });
});

/**
 * Validate an existing token and then remove it a short while later
 */
var validateAuthToken = Promise.method(function(authCookieValue) {
  /* Auth cookie */
  if(!authCookieValue) return;

  var authToken = authCookieValue.split(":", 2);
  if(authToken.length !== 2) return;

  var key = authToken[0];
  var clientToken = authToken[1];

  if(!key) return;

  debug('Client has presented a rememberme auth cookie, attempting reauthentication: %s', key);

  var redisKey = REMEMBER_ME_PREFIX + key;

  return Promise.fromCallback(function(callback) {
      return redisClient.multi()
            .get(redisKey)
            .pexpire(redisKey, tokenGracePeriodMillis)
            .exec(callback);
    })
    .then(function(replies) {
      var tokenInfo = replies[0];
      if(!tokenInfo) {
        return;
      }

      var stored = parseToken(tokenInfo);
      if(!stored) {
        logger.info("rememberme: Saved token is corrupt.", { key: key, tokenInfo: tokenInfo });
        return;
      }

      var serverHash = stored.hash;

      return Promise.fromCallback(function(callback) {
          sechash.testHash(clientToken, serverHash, callback);
        })
        .then(function(match) {
          if(!match) {
            logger.warn("rememberme: testHash failed. Illegal token", {
              serverHash: serverHash,
              clientToken: clientToken,
              key: key
            });

            return;
          }

          var userId = stored.userId;
          return userId;
        });
    });
});

/**
 * Authenticate a user with the presented cookie.
 *
 * Returns the user and a new cookie for the user
 * or null if the token is invalid
 */
function processRememberMeToken(presentedCookie) {
  return validateAuthToken(presentedCookie)
    .then(function(userId) {
      debug('Resolved userId=%s for token=%s', userId, presentedCookie);
      if (!userId) return;

      return userService.findById(userId)
        .then(function(user) {
          if (!user) return null;

          /* No token, user will need to relogin */
          if(userScopes.isMissingTokens(user)) return null;

          return generateAuthToken(user._id)
            .catch(function(err) {
              logger.warn("rememberme: generateAuthToken failed", { exception: err });

              // Ignore errors that occur while generating a new token
              return null;
            })
            .then(function(newCookieValue) {
              return {
                user: user,
                newCookieValue: newCookieValue,
              };
            });
        });
      });
}

function setRememberMeCookie(res, cookieValue) {
  res.cookie(cookieName, cookieValue, {
    domain: cookieDomain,
    maxAge: 1000 * 60 * 60 * 24 * timeToLiveDays,
    httpOnly: true,
    secure: cookieSecure
  });
}

/**
 * Safe parse a token
 */
function parseToken(tokenInfo) {
  try {
    return JSON.parse(tokenInfo);
  } catch(e) {
    /* */
  }
}


module.exports = {
  deleteRememberMeToken: function(cookie, callback) {
      return deleteAuthToken(cookie)
        .asCallback(callback);
  },

  generateRememberMeTokenMiddleware: function(req, res, next) {
    return generateAuthToken(req.user.id)
      .then(function(newCookieValue) {
        setRememberMeCookie(res, newCookieValue);
        return null;
      })
      .asCallback(next);
  },

  rememberMeMiddleware: function(req, res, next) {
    /* If the user is logged in or doesn't have cookies, continue */
    if (req.user || !req.cookies || !req.cookies[cookieName]) return next();

    return processRememberMeToken(req.cookies[cookieName])
      .then(function(loginDetails) {
        if (!loginDetails) {
          stats.event("rememberme_rejected");
          res.clearCookie(cookieName, { domain: nconf.get("web:cookieDomain") });
          return;
        }

        var user = loginDetails.user;
        var newCookieValue = loginDetails.newCookieValue;

        if (newCookieValue) {
          setRememberMeCookie(res, newCookieValue);
        }

        // Remove the old token for this user
        req.accessToken = null;

        // Tracking
        var properties = useragentTagger(req);
        stats.userUpdate(user, properties);

        stats.event("rememberme_accepted");

        stats.event("user_login", _.extend({
          userId: user._id,
          method: 'auto',
          email: user.email
        }, properties));

        // Finally, log the user in
        return passportLogin(req, user);
      })
      .catch(function(err) {
        debug('Rememberme token failed with %s', err);
        stats.event("rememberme_rejected");
        res.clearCookie(cookieName, { domain: nconf.get("web:cookieDomain") });
        throw err;
      })
      .asCallback(next);
  },

  testOnly: {
    processRememberMeToken: processRememberMeToken,
    generateAuthToken: generateAuthToken,
    validateAuthToken: validateAuthToken,
    deleteAuthToken: deleteAuthToken,
    setTokenGracePeriodMillis: function(time) {
      tokenGracePeriodMillis = time;
    }
  }
};
