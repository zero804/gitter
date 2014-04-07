/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var passport    = require("passport");
var rateLimiter = require('./rate-limiter');
var winston     = require('../../utils/winston');

function ensureLoggedIn(req, res, next) {
  if(!req.user) {
    res.send(401, { error: true, loginRequired: true });
    return;
  }

  if(!req.user.githubToken && !req.user.githubUserToken) {
    winston.error("User no longer has a token", { username: req.user.username });
    res.send(401, { error: true, loginRequired: true });
    return;
  }

  next();
}

module.exports = [
  passport.authenticate('bearer', { session: false }),
  ensureLoggedIn,
  rateLimiter
];
