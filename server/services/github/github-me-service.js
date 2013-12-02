/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var github = require('octonode');
var publicClient = github.client();
var Q = require('q');
var assert = require('assert');
var wrap = require('./github-cache-wrapper');

function GitHubMeService(user) {
  assert(!user || user.githubToken, 'User must have a githubToken');

  this.user = user;
  this.client = user ? github.client(user.githubToken) : publicClient;
}

GitHubMeService.prototype.getUser = function() {
  var d = Q.defer();

  var ghme = this.client.me();
  ghme.info(d.makeNodeResolver());

  return d.promise;
};

GitHubMeService.prototype.getEmails = function() {
  var d = Q.defer();

  var ghme = this.client.me();
  ghme.emails(d.makeNodeResolver());

  return d.promise;
};


GitHubMeService.prototype.getStarredRepos = function() {
  var d = Q.defer();

  var ghme = this.client.me();
  ghme.starred(d.makeNodeResolver());

  return d.promise;
};

GitHubMeService.prototype.getWatchedRepos = function() {
  var d = Q.defer();

  var ghme = this.client.me();
  ghme.watched(d.makeNodeResolver());

  return d.promise;
};

GitHubMeService.prototype.getOrgs = function() {
  var d = Q.defer();

  var ghme = this.client.me();
  ghme.orgs(d.makeNodeResolver());

  return d.promise;
};

GitHubMeService.prototype.getRepos = function() {
  var d = Q.defer();

  var ghme = this.client.me();
  ghme.repos(d.makeNodeResolver());

  return d.promise;
};

module.exports = wrap(GitHubMeService, function() {
  return [this.user && this.user.githubToken || ''];
});

