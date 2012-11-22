/*jslint node: true */
"use strict";

var passport = require("passport"),
    winston = require("winston"),
    rememberMe = require('../web/rememberme-middleware');

exports.ensureLoggedIn = function(options) {
  if(!options) options = {};
  var setReturnTo = (options.setReturnTo === undefined) ? true : options.setReturnTo;

  return function(req, res, next) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      if(req.accepts(['json','html']) === 'json') {
        return next(401);
      }

      if (setReturnTo && req.session) {
        req.session.returnTo = req.url;
      }
      return res.redirect("/login");
    }
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

      winston.info("Authentication succeeded", { scheme: scheme });
      req.login(user, options, next);
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