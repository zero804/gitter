/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var github = require('octonode');
var publicClient = github.client();
var Q = require('q');
var assert = require('assert');
var wrap = require('./github-cache-wrapper');

function GitHubOrgService(user) {
  assert(!user || user.githubToken, 'User must have a githubToken');

  this.user = user;
  this.client = user ? github.client(user.githubToken) : publicClient;
}

/**
 * Returns the details of an org
 */
GitHubOrgService.prototype.getOrg = function(org) {
  var ghorg  = this.client.org(org);
  var d = Q.defer();
  ghorg.info(d.makeNodeResolver());
  return d.promise;
};

/**
 * Returns the list of users with publisized membership to an organisation
 */
GitHubOrgService.prototype.members = function(org) {
  var ghorg  = this.client.org(org);
  var d = Q.defer();
  ghorg.members(d.makeNodeResolver());
  return d.promise;
};

GitHubOrgService.prototype.member = function(org, username) {
  var ghorg  = this.client.org(org);
  var d = Q.defer();
  ghorg.member(username, d.makeNodeResolver());
  return d.promise
    .fail(function(err) {
      if(err.statusCode === 404) return false;
      throw err;
    });
};

GitHubOrgService.prototype.getRepos = function(org) {
  var ghorg  = this.client.org(org);
  var d = Q.defer();
  ghorg.repos(d.makeNodeResolver());
  return d.promise;
};

// module.exports = GitHubOrgService;
module.exports = wrap(GitHubOrgService, function() {
  return [this.user && this.user.username || ''];
});
