/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var github = require('octonode');
var publicClient = github.client();
var Q = require('q');

function GitHubUserService(user) {
  this.user = user;
  this.client = user ? github.client(user.githubToken) : publicClient;
}

GitHubUserService.prototype.getAuthenticatedUser = function() {
  var d = Q.defer();

  var ghme = this.client.me();
  ghme.info(d.makeNodeResolver());

  return d.promise;
};

GitHubUserService.prototype.getUser = function(user) {
  var d = Q.defer();

  var ghuser = this.client.user(user);
  ghuser.info(d.makeNodeResolver());

  return d.promise;
};

module.exports = GitHubUserService;