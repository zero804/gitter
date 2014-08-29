/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q                    = require('q');
var assert = require('assert');
var permissionsModel = require('./permissions-model');
var User = require('./persistence-service').User;

module.exports = function(username, right, uri, roomType, security, options) {
  return Q.fcall(function() {
    assert(username, 'username required');

    var tempUser = new User({ username: username });

    return permissionsModel(tempUser, right, uri, roomType, security, options);
  });
};
