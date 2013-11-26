/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var github = require('octonode');
var publicClient = github.client();
var Q = require('q');
var assert = require('assert');

function GitHubIssueService(user) {
  assert(!user || user.githubToken, 'User must have a githubToken');

  this.user = user;
  this.client = user ? github.client(user.githubToken) : publicClient;
}

/**
 * Returns a promise of the first 30 issues for a repo
 */
GitHubIssueService.prototype.getIssues = function() {
  var ghrepo = this.client.repo('twbs/bootstrap');
  var d = Q.defer();
  ghrepo.issues(d.makeNodeResolver());
  return d.promise;
};

module.exports = GitHubIssueService;