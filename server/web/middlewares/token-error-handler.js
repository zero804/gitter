/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var logoutDestroyTokens = require('./logout-destroy-tokens');
var winston = require('../../utils/winston');

/* Has to have four args */
module.exports = function(err, req, res, next) {
  if(err && err.gitterAction === 'logout_destroy_user_tokens') {
    winston.info('token-error-handler: logout_destroy_user_tokens error caught');

    return logoutDestroyTokens(req, res, next);
  }

  return next(err);
};