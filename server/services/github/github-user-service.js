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

GitHubUserService.prototype.getAuthenticatedUser = function() {
  var d = Q.defer();

  var ghme = this.client.me();
  ghme.info(d.makeNodeResolver());

  return d.promise;
};

GitHubUserService.prototype.getAuthenticatedUserEmails = function() {
  var d = Q.defer();

  var ghme = this.client.me();
  ghme.emails(d.makeNodeResolver());

  return d.promise;
};

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

GitHubUserService.prototype.getOrgs = function() {
  var d = Q.defer();

  var ghme = this.client.me();
  ghme.orgs(d.makeNodeResolver());

  return d.promise;
};

GitHubUserService.prototype.getRepos = function() {
  var d = Q.defer();

  var ghme = this.client.me();
  ghme.repos(d.makeNodeResolver());

  return d.promise;
};

module.exports = wrap(GitHubUserService, function() {
  return [this.user && this.user.username || ''];
});

