/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var passport    = require("passport");
var winston     = require('../utils/winston');
var rememberMe  = require('./rememberme-middleware');
var useragent   = require('useragent');
var dolph       = require('dolph');
var redis       = require("../utils/redis");
var redisClient = redis.getClient();

var logoutMiddleware = require('./middlewares/logout');

function hasAccessToken(req) {
  return req.headers && req.headers['authorization'] ||
         req.body && req.body['access_token'] ||
         req.query && req.query['access_token'];
}

/* Optional middleware for oauth */
function bearerAuthMiddleware(req, res, next) {
  if(!hasAccessToken(req)) return next();

  /* Temporary fix - remove 15 May 2014 */
  /* A bug in the OSX client adds this header each time a refresh is done */
  if(req.headers && req.headers['authorization']) {
    var a = req.headers['authorization'];
    if(a.indexOf('Bearer ') === 0 && a.indexOf(',') >= 0) {
      winston.warn('auth: compensating for incorrect auth header');
      req.headers['authorization'] = a.split(/,/)[0];
    }
  }
  /* End Temporary fix */

  passport.authenticate('bearer', { session: true }, function(err, user, info) {
    if(err) return next(err);
    if(!user) return next(401);

    return req.logIn(user, function(err) {
      if (err) return next(err);
      if(info) {
        passport.transformAuthInfo(info, function(err, tinfo) {
          if (err) return next(err);
          req.authInfo = tinfo;
          next();
        });
      } else {
        next();
      }
    });

  })(req, res, next);
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
    require('./middlewares/enforce-csrf'),
    function(req, res, next) {
      if (req.user) {
        if(req.user.isMissingTokens()) {
          winston.verbose('Client needs to reauthenticate');

          logoutMiddleware(req, res, function() {

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

      if(options.allowGet && req.method === 'GET') {
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
