/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var github = require('octonode');
var publicClient = github.client();
var Q = require('q');

function GitHubOrgService(user) {
  this.user = user;
  this.client = user ? github.client(user.githubToken) : publicClient;
}

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

module.exports = GitHubOrgService;