/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var logoutDestroyTokens = require('./logout-destroy-tokens');
var winston = require('../../utils/winston');

module.exports = function(req, res, next) {
  var user = req.user;
  if(user && user.isMissingTokens()) {
    winston.warn('tokenless-user-middleware: authenticated user has no tokens, rejecting.', {
      username: user.username,
      userId: user.id
    });

    return logoutDestroyTokens(req, res, next);
  }
  return next();
};
