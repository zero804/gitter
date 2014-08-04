/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var github = require('octonode');
var assert = require('assert');
var request = require('./request-wrapper');

function createClient(user, token) {
  var client = github.client(token, { request: request });

  return client;
}

module.exports = exports = {
  user: function(user) {
    if(!user) return createClient();

    assert(user, 'user required');
    var token = user.githubUserToken || user.githubToken;
    return createClient(user, token);
  },
  full: function(user) {
    if(!user) return createClient();

    assert(user, 'user required');
    var token = user.githubToken || user.githubUserToken;
    return createClient(user, token);
  },
  makeResolver: function(defer) {
    /* Similar to Q's makeNodeResolver, but ensures that the result is
     * not an array of the real result and the headers (octonode returns
     * two values which get turned into an array)  */
    return function(err, s) {
      if(err) return defer.reject(err);
      return defer.resolve(s);
    };
  }
};
