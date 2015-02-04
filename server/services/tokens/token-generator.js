'use strict';

var random = require('../../utils/random');
var Q      = require('q');

module.exports = {
  getToken: function(userId, clientId) { // jshint unused:false
    return random.generateToken()
      .then(function(token) {
        if(!userId) {
          // Anonymous tokens start with a `$`
          return "$" + token;
        } else {
          return token;
        }
      });
  },

  validateToken: function(token) { // jshint unused:false
    return Q.resolve();
  },

  cacheToken: function(userId, clientId, token) { // jshint unused:false
    return Q.resolve();
  },

  deleteToken: function(token) { // jshint unused:false
    return Q.resolve();
  }
};
