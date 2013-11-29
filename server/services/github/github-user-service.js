/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var github = require('octonode');
var publicClient = github.client();
var Q = require('q');
var assert = require('assert');
var wrap = require('./github-cache-wrapper');

function GitHubUserService(user) {
  assert(!user || user.githubToken, 'User must have a githubToken');

  this.user = user;
  this.client = user ? github.client(user.githubToken) : publicClient;
}

GitHubUserService.prototype.getUser = function(user) {
  var d = Q.defer();

  var ghuser = this.client.user(user);
  ghuser.info(d.makeNodeResolver());

  return d.promise
    .fail(function(err) {
      if(err.statusCode === 404) return null;
      throw err;
    });
};

module.exports = wrap(GitHubUserService, function() {
  return [this.user && this.user.username || ''];
});

