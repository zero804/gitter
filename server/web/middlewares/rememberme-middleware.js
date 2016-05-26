"use strict";

var env = require('gitter-web-env');
var logger = env.logger;
var nconf = env.config;
var stats = env.stats;

var _ = require('lodash');
var uuid = require('node-uuid');
var sechash = require('sechash');
var userService = require('../../services/user-service');
var useragentTagger = require('../../utils/user-agent-tagger');
var debug = require('debug')('gitter:infra:rememberme-middleware');
var userScopes = require('gitter-web-identity/lib/user-scopes');
var passportLogin = require('../passport-login');
var Promise = require('bluebird');

var cookieName = nconf.get('web:cookiePrefix') + 'auth';

var redisClient = env.redis.getClient();

var tokenGracePeriodMillis = 5000; /* How long after a token has been used can you reuse it? */
var timeToLiveDays = nconf.get("web:rememberMeTTLDays");

var REMEMBER_ME_PREFIX = "rememberme:";

function generateAuthToken(userId) {
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
    .return([key, token]);
}

function setupRememberMeTokenCookie(req, res, userId) {
  return generateAuthToken(userId)
    .spread(function(key, token) {
      res.cookie(cookieName, key + ":" + token, {
        domain: nconf.get("web:cookieDomain"),
        maxAge: 1000 * 60 * 60 * 24 * timeToLiveDays,
        httpOnly: true,
        secure: nconf.get("web:secureCookies")
      });
    });
}

function parseToken(tokenInfo) {
  try {
    return JSON.parse(tokenInfo);
  } catch(e) {
    /* */
  }
}

var deleteAuthToken = Promise.method(function(authCookieValue) {
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

/* Validate a token and call callback(err, userId) */
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
        logger.info("rememberme: rememberme token not found. Illegal or expired.", { key: key });
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

module.exports = {
  deleteRememberMeToken: function(cookie, callback) {
      return deleteAuthToken(cookie)
        .asCallback(callback);
  },

  generateRememberMeTokenMiddleware: function(req, res, next) {
    return setupRememberMeTokenCookie(req, res, req.user.id)
      .asCallback(next);
  },

  rememberMeMiddleware: function(req, res, next) {
    /* If the user is logged in or doesn't have cookies, continue */
    if (req.user || !req.cookies || !req.cookies[cookieName]) return next();

    return Promise.try(function() {
        return validateAuthToken(req.cookies[cookieName]);
      })
      .then(function(userId) {
        if (!userId) return;
        return userService.findById(userId);
      })
      .then(function(user) {
        if (!user) return;

        /* No token, no touch */
        if(userScopes.isMissingTokens(user)) return;

        // Remove the old token for this user
        req.accessToken = null;

        // Tracking
        var properties = useragentTagger(req.headers['user-agent']);
        stats.userUpdate(user, properties);

        debug('Rememberme token used for login: %s', req.headers.cookie);

        return setupRememberMeTokenCookie(req, res, user._id)
          .catch(function(err) {
            logger.warn("rememberme: setupRememberMeTokenCookie failed", {
              exception: err
            });
          })
          .then(function() {
            stats.event("rememberme_accepted");

            stats.event("user_login", _.extend({
              userId: user._id,
              method: 'auto',
              email: user.email
            }, properties));

            return passportLogin(req, user);
          });

      })
      .tap(function(user) {
        if (!user) {
          res.clearCookie(cookieName, { domain: nconf.get("web:cookieDomain") });
          stats.event("rememberme_rejected");
        }
      })
      .catch(function(err) {
        stats.event("rememberme_rejected");

        res.clearCookie(cookieName, { domain: nconf.get("web:cookieDomain") });
        throw err;
      })
      .asCallback(next);
  },

  testOnly: {
    generateAuthToken: generateAuthToken,
    validateAuthToken: validateAuthToken,
    deleteAuthToken: deleteAuthToken,
    setTokenGracePeriodMillis: function(time) {
      tokenGracePeriodMillis = time;
    }
  }
};
