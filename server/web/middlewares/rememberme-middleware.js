"use strict";

var env             = require('gitter-web-env');
var logger          = env.logger;
var nconf           = env.config;
var stats           = env.stats;

var _               = require('lodash');
var uuid            = require('node-uuid');
var sechash         = require('sechash');
var userService     = require('../../services/user-service');
var useragentTagger = require('../../utils/user-agent-tagger');
var debug           = require('debug')('gitter:rememberme-middleware');
var userScopes      = require('gitter-web-identity/lib/user-scopes');

var cookieName = nconf.get('web:cookiePrefix') + 'auth';

var redisClient = env.redis.getClient();

var tokenGracePeriodMillis = 5000; /* How long after a token has been used can you reuse it? */
var timeToLiveDays = nconf.get("web:rememberMeTTLDays");

function generateAuthToken(userId, callback) {
  var key = uuid.v4();
  var token = uuid.v4();

  sechash.strongHash('sha512', token, function(err, hash3) {
    if(err) return callback(err);

    var json = JSON.stringify({ userId: userId, hash: hash3 });
    redisClient.setex("rememberme:" + key, 60 * 60 * 24 * timeToLiveDays, json);

    /* The server doesn't keep a copy of the token anywhere, only the hash */
    callback(null, key, token);
  });

}

function setupRememberMeTokenCookie(req, res, userId, callback) {
  generateAuthToken(userId, function(err, key, token) {
    res.cookie(cookieName, key + ":" + token, {
      domain: nconf.get("web:cookieDomain"),
      maxAge: 1000 * 60 * 60 * 24 * timeToLiveDays,
      httpOnly: true,
      secure: nconf.get("web:secureCookies")
    });

    callback();
  });
}

function parseToken(tokenInfo) {
  try {
    return JSON.parse(tokenInfo);
  } catch(e) {
    /* */
  }
}

function deleteAuthToken(authCookieValue, callback) {
  /* Auth cookie */
  if(!authCookieValue) return callback();

  var authToken = authCookieValue.split(":", 2);
  if(authToken.length != 2) return callback();

  var key = authToken[0];

  if(!key) return callback();

  debug('Deleting rememberme token %s', key);

  var redisKey = "rememberme:" + key;

  /* After the rememberme token has been used, it will expire in 5 seconds */
  redisClient.del(redisKey, callback);
}

/* Validate a token and call callback(err, userId) */
function validateAuthToken(authCookieValue, callback) {
    /* Auth cookie */
    if(!authCookieValue) return callback();

    var authToken = authCookieValue.split(":", 2);
    if(authToken.length != 2) return callback();

    var key = authToken[0];
    var clientToken = authToken[1];

    if(!key) return callback();

    debug('Client has presented a rememberme auth cookie, attempting reauthentication: %s', key);

    var redisKey = "rememberme:" + key;

    /* After the rememberme token has been used, it will expire in 5 seconds */
    redisClient.multi()
      .get(redisKey)
      .pexpire(redisKey, tokenGracePeriodMillis)
      .exec(function(err, replies) {
        if(err) return callback(err);

        var tokenInfo = replies[0];
        if(!tokenInfo) {
          logger.info("rememberme: rememberme token not found. Illegal or expired.", { key: key });
          return callback();
        }

        var stored = parseToken(tokenInfo);
        if(!stored) {
          logger.info("rememberme: Saved token is corrupt.", { key: key, tokenInfo: tokenInfo });
          return callback();
        }

        var serverHash = stored.hash;

        sechash.testHash(clientToken, serverHash, function(err, match) {
          if(err) {
            logger.error("rememberme: error during testHash", { err: err });
            return callback(err);
          }

          if(!match) {
            logger.warn("rememberme: testHash failed. Illegal token", {
              serverHash: serverHash,
              clientToken: clientToken,
              key: key
            });

            return callback();
          }

          var userId = stored.userId;

          return callback(null, userId);
        });
      });
}

module.exports = {
  deleteRememberMeToken: function(cookie, callback) {
      deleteAuthToken(cookie, function(err) {
        if(err) { logger.warn('Error validating token, but ignoring error ' + err, { exception: err }); }

        return callback();
      });
  },

  generateRememberMeTokenMiddleware: function(req, res, next) {
    setupRememberMeTokenCookie(req, res, req.user.id, next);
  },

  rememberMeMiddleware: function(req, res, next) {
    function fail(err) {
      stats.event("rememberme_rejected");

      res.clearCookie(cookieName, { domain: nconf.get("web:cookieDomain") });
      return next(err);
    }

    /* If the user is logged in, no problem */
    if (req.user) return next();

    if(!req.cookies || !req.cookies[cookieName]) return next();

    validateAuthToken(req.cookies[cookieName], function(err, userId) {
      if(err || !userId) return fail(err);

      userService.findById(userId, function(err, user) {
        if(err)  return fail(err);
        if(!user) return fail();

        /* No token, no touch */
        if(userScopes.isMissingTokens(user)) {
          return fail();
        }

        req.login(user, function(err) {
          if(err) {
            logger.info("rememberme: Passport login failed", { exception: err  });
            return fail(err);
          }

          // Remove the old token for this user
          req.accessToken = null;
          if(req.session) req.session.accessToken = null;

          // Tracking
          var properties = useragentTagger(req.headers['user-agent']);
          stats.userUpdate(user, properties);

          debug('Rememberme token used for login: %s', req.headers.cookie);

          setupRememberMeTokenCookie(req, res, userId, function(err) {
            if(err) return next(err);

            stats.event("rememberme_accepted");

            stats.event("user_login", _.extend({
              userId: userId,
              method: 'auto',
              email: user.email
            }, properties));

            return next(err);
          });

        });

      });

    });


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
