"use strict";

var env = require('gitter-web-env');
var winston = env.logger;
var nconf = env.config;
var rememberMe = require('./rememberme-middleware');

var authCookieName = nconf.get('web:cookiePrefix') + 'auth';
var sessionCookieName = nconf.get('web:cookiePrefix') + 'session';

// This isn't actually a middleware, it's a useful function that
// should probably be put somewhere else
function logoutPreserveSession(req, res, next) {
  req.logout();

  var authCookie = req.cookies[authCookieName];

  if(authCookie) {
    res.clearCookie(authCookieName, { domain: nconf.get("web:cookieDomain") });

    return rememberMe.deleteRememberMeToken(authCookie, next);
  }

  return next();
}

module.exports = function(req, res, next) {
  var user = req.user;
  var userId = user && user.id;
  var username = user && user.username;

  winston.info('logout: logging out user', {
    userId: userId,
    username: username
  });

  logoutPreserveSession(req, res, function() {
    res.clearCookie(sessionCookieName, { domain: nconf.get("web:cookieDomain") });

    req.session.destroy(function(err) {
      req.session = null;
      next(err);
    });
  });
};
