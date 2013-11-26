/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var github = require('octonode');
var publicClient = github.client();
var Q = require('q');
var assert = require('assert');
var wrap = require('./github-cache-wrapper');

function GitHubIssueService(user) {
  assert(!user || user.githubToken, 'User must have a githubToken');

  this.user = user;
  this.client = user ? github.client(user.githubToken) : publicClient;
}


/**
 * Returns the information about the specified repo
 * @return the promise of information about a repo
 */
GitHubIssueService.prototype.getRepo = function(repo) {
  var ghrepo = this.client.repo(repo);
  var d = Q.defer();
  ghrepo.info(d.makeNodeResolver());
  return d.promise;
};

/**
 * Returns a promise of the first 30 issues for a repo
 */
GitHubIssueService.prototype.getIssues = function(repo) {
  var ghrepo = this.client.repo(repo);
  var d = Q.defer();
  ghrepo.issues(d.makeNodeResolver());
  return d.promise;
};

// module.exports = GitHubIssueService;
module.exports = wrap(GitHubIssueService, function() {
  return [this.user && this.user.username || ''];
});