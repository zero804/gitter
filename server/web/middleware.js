/*jslint node: true */
"use strict";

var passport = require("passport"),
    winston = require("winston"),
    rememberMe = require('../web/rememberme-middleware');

/* Ensures that the person is logging in. However, if they present a bearer token,
 * we'll try log them in first
 */
exports.ensureLoggedIn = function(options) {
  if(!options) options = {};
  var setReturnTo = (options.setReturnTo === undefined) ? true : options.setReturnTo;

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
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        if(req.accepts(['json','html']) === 'json') {
          winston.error("middleware: User is not logged in. Ye shall not pass!");
          res.send(401, { success: false, loginRequired: true });
          return;
        }

        if (setReturnTo && req.session) {
          req.session.returnTo = req.url;
        }
        return res.redirect("/login");
      }
      next();
    }
  ];

};

exports.logout = function(options) {
  return function(req, res, next) {
    req.logout();
    res.clearCookie("auth");
    next();
  };

};

exports.authenticate = function(scheme, options) {
  return function(req, res, next) {
    winston.debug("Attempting authentication", { scheme: scheme });

    /* If you're trying to login, you're automatically logged out */
    req.logout();

    passport.authenticate(scheme, function(err, user, info) {
      if (err || !user) {
        winston.info("Authentication failed ", { scheme: scheme });

        if(req.accepts(['json','html']) === 'json') {
          res.send(401);
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

exports.rememberMe = function(req, res, next) {
  if(req.body.rememberMe) {
    rememberMe.generateAuthToken(req, res, req.user.id, {}, function(err) {
      if(err) return next(err);
      next();
    });
  } else {
    next();
  }
};