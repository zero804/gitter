/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');
var wrap = require('./github-cache-wrapper');
var createClient = require('./github-client');

function GitHubOrgService(user) {
  this.user = user;
  this.client = createClient.user(user);
}

/**
 * Returns the details of an org
 */
GitHubOrgService.prototype.getOrg = function(org) {
  var ghorg  = this.client.org(org);
  var d = Q.defer();
  ghorg.info(d.makeNodeResolver());

  return d.promise
    .fail(function(err) {
      if(err.statusCode === 404) return null;
      throw err;
    });
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
  return [this.user && (this.user.githubUserToken || this.user.githubToken) || ''];
});
