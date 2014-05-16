/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var loginRequired = require('./login-required');

module.exports = function(req, res, next) {
  if (req.user) {
    return next();
  }

  loginRequired(req, res, next);
};

