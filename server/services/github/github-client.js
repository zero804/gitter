/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var github = require('octonode');
var assert = require('assert');
var request = require('./request-wrapper');

function createClient(token, options) {
  options = options || {};
  var requestClient = options.firstPageOnly ? request.firstPageOnlyRequest : request;
  var client = github.client(token, { request: requestClient });

  return client;
}

module.exports = exports = {
  user: function(user, options) {
    if(!user) return createClient(null, options);

    assert(user, 'user required');
    var token = user.githubUserToken || user.githubToken;
    return createClient(token, options);
  },
  full: function(user, options) {
    if(!user) return createClient(null, options);

    assert(user, 'user required');
    var token = user.githubToken || user.githubUserToken;
    return createClient(token, options);
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
