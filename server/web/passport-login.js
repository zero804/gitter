'use strict';

var Promise = require('bluebird');

function logIn(req, user) {
  return Promise.fromCallback(function(callback) {
      req.login(user, callback);
    })
    .return(user);
}
/**
 * Performs a passport login,
 * and returns a user with identity object
 */
module.exports = function(req, user) {
  return logIn(req, user);
};
