/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var passport    = require("passport");
var rateLimiter = require('./rate-limiter');
var logoutDestroyTokens = require('./logout-destroy-tokens');

function ensureLoggedIn(req, res, next) {
  if(!req.user) {
    res.send(401, { error: true, loginRequired: true });
    return;
  }

  if(req.user.isMissingTokens()) {
    return logoutDestroyTokens(req, res, next);
  }

  next();
}

module.exports = [
  passport.authenticate('bearer', { session: false }),
  ensureLoggedIn,
  rateLimiter
];
