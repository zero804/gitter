/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var passport = require("passport"),
    winston = require("winston"),
    nconf = require('../utils/config'),
    rememberMe = require('./rememberme-middleware');

var authCookieName = nconf.get('web:cookiePrefix') + 'auth';
var sessionCookieName = nconf.get('web:cookiePrefix') + 'session';

/* Ensures that the person is logging in. However, if they present a bearer token,
 * we'll try log them in first
 */
exports.ensureLoggedIn = function(options) {
  if(!options) options = {};


  var bearerLogin = passport.authenticate('bearer', { session: true });

  return [
    function(req, res, next) {
      if (req.headers && req.headers['authorization']) {
        var parts = req.headers['authorization'].split(' ');
        if (parts.length == 2) {
          var scheme = parts[0];
          if(/OAuth2/.test(scheme)) {
            // Dodgy hack to sort out problem with RestKit
            req.headers['authorization'] = 'Bearer ' + parts[1];
            bearerLogin(req, res, next);
            return;
          }
          if (/Bearer/i.test(scheme)) {
            bearerLogin(req, res, next);
            return;
          }
        }
      }
      next();
    },
    function(req, res, next) {
      if (req.isAuthenticated && req.isAuthenticated()) return next();

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
          console.log(">>>>>>>>>>>>>>>>>>>>>>> URL!!! " + url);
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

exports.authenticate = function(scheme, options) {
  return function(req, res, next) {
    winston.verbose("Attempting authentication", { scheme: scheme });

    /* If you're trying to login, you're automatically logged out */
    req.logout();

    passport.authenticate(scheme, function(err, user, info) {
      if (err || !user) {
        winston.info("Authentication failed ", { scheme: scheme });

        if(req.accepts(['json','html']) === 'json') {
          var reason = info ? info.reason : undefined;

          res.send(401, { success: false, reason: reason });
        } else {
          res.relativeRedirect(options.failureRedirect);
        }
        return;
      }

      winston.info("Authentication succeeded, logging user in", { scheme: scheme, userId: user.id });

      req.login(user, options, function(err) {
        if(err) {
          winston.info("Passport login failed", { exception: err  });
          return next(err);
        }

        winston.info("Passport login succeeded");
        next();
      });
    })(req, res, next);
  };
};

exports.grantAccessForRememberMeTokenMiddleware = rememberMe.rememberMeMiddleware(/* No Options */);


exports.generateRememberMeTokenMiddleware = function(req, res, next) {
  if(req.body.rememberMe) {
    rememberMe.generateAuthToken(req, res, req.user.id, {}, function(err) {
      if(err) return next(err);
      next();
    });
  } else {
    next();
  }
};

exports.simulateDelay = function(timeout) {
  return function(req, res, next) {
    setTimeout(function() {
      return next();
    }, timeout);
  }
}