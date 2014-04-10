/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var passport    = require("passport");
var winston     = require('../utils/winston');
var nconf       = require('../utils/config');
var rememberMe  = require('./rememberme-middleware');
var useragent   = require('useragent');
var dolph       = require('dolph');
var redis       = require("../utils/redis");
var redisClient = redis.createClient();

var authCookieName = nconf.get('web:cookiePrefix') + 'auth';
var sessionCookieName = nconf.get('web:cookiePrefix') + 'session';

var bearerLogin = passport.authenticate('bearer', { session: true });
function bearerAuthMiddleware(req, res, next) {
  // If the user is already logged in, don't check for OAUTH tokens
  // This could potentially lead to problems if one user is logged in
  // but another users oauth token is presented, but this is pretty edge
  // and getting around it would be very ineffiecent
  if(req.user) return next();

  if(req.headers.authorization)  {
    /* Bearer login is not optional, so if you don't present a token we get a 401 */
    return bearerLogin(req, res, next);
  }

  return next();
}

var rateLimiter = dolph({
  prefix: 'rate:',
  limit: 100,
  expiry: 60,
  applyLimit: function(req) {
    return !!(req.user && req.authInfo && req.authInfo.client);
  },
  keyFunction: function(req) {
    return req.user.id + ':' + req.authInfo.client.id;
  },
  redisClient: redisClient
 });


/* Ensures that the person is logging in. However, if they present a bearer token,
 * we'll try log them in first
 */
exports.ensureLoggedIn = function(options) {
  if(!options) options = {};

  return [
    bearerAuthMiddleware,
    rememberMe.rememberMeMiddleware(/* No Options */),
    rateLimiter,
    require('./csrf-middleware'),
    function(req, res, next) {
      if (req.user) {
        if(!req.user.githubToken && !req.user.githubUserToken) {
          winston.verbose('Client needs to reauthenticate');

          exports.logout()(req, res, function() {

            // Are we dealing with an API client? Tell em in HTTP
            if(req.accepts(['json','html']) === 'json') {
              winston.error("User no longer has a token");
              res.send(401, { success: false, loginRequired: true });
              return;
            }

            /* Not a web client? Give them the message straightup */
            if(req.headers['authorization']) {
              return next(401);
            }

            return res.relativeRedirect("/");
          });

          return;
        }

        return next();
      }

      winston.verbose('Client needs to authenticate', options);

      // Are we dealing with an API client? Tell em in HTTP
      if(req.accepts(['json','html']) === 'json') {
        winston.error("middleware: User is not logged in. Ye shall not pass!");
        res.send(401, { success: false, loginRequired: true });
        return;
      }

      if (options.setReturnTo !== false && req.session) {
        req.session.returnTo = req.url;
      }

      if(!options.loginUrl) {
        return res.relativeRedirect("/login");
      }

      if(typeof options.loginUrl == "function") {
        options.loginUrl(req, function(err, url) {
          if(err) return next(err);
          res.relativeRedirect(url);
        });
        return;
      }

      res.relativeRedirect(options.loginUrl);
      return;
    }
  ];

};

// This isn't actually a middleware, it's a useful function that
// should probably be put somewhere else
exports.logoutPreserveSession = function(req, res, done) {
  req.logout();
  var authCookie = req.cookies[authCookieName];
  if(authCookie) {
    rememberMe.deleteRememberMeToken(authCookie, logoutNextStep);
  } else {
    logoutNextStep();
  }

  function logoutNextStep(err) {
    if(err) return done(err);

    res.clearCookie(authCookieName, { domain: nconf.get("web:cookieDomain") });
    done();
  }
};

exports.logout = function() {
  return function(req, res, next) {

    exports.logoutPreserveSession(req, res, function() {
      res.clearCookie(sessionCookieName, { domain: nconf.get("web:cookieDomain") });

      req.session.destroy(function(err) {
        req.session = null;
        next(err);
      });
    });
  };

};

exports.grantAccessForRememberMeTokenMiddleware = [
  bearerAuthMiddleware,
  rateLimiter,
  rememberMe.rememberMeMiddleware(/* No Options */),
];

exports.generateRememberMeTokenMiddleware = function(req, res, next) {
  rememberMe.generateAuthToken(req, res, req.user.id, {}, function(err) {
    if(err) return next(err);
    next();
  });
};

exports.simulateDelay = function(timeout) {
  return function(req, res, next) {
    setTimeout(function() {
      return next();
    }, timeout);
  };
};

exports.ensureValidBrowser = function(req, res, next) {
  var agent = useragent.parse(req.headers['user-agent']);
  if(agent.family === 'IE' && agent.major <= 10) {
    res.relativeRedirect('/-/unawesome-browser');
  } else {
    next();
  }

};
