"use strict";

var wrap = require('./github-cache-wrapper');
var gittercat = require('./tentacles-client');
var userTokenSelector = require('./user-token-selector').full;

function GitHubRepoService(user) {
  this.user = user;
  this.accessToken = userTokenSelector(user);
}


/**
 * Returns the information about the specified repo
 * @return the promise of information about a repo
 */
 GitHubRepoService.prototype.getRepo = function(repo) {
  return gittercat.repo.get(repo, { accessToken: this.accessToken });
};

/**
 *
 */
GitHubRepoService.prototype.isCollaborator = function(repo, username) {
  return gittercat.repoCollaborator.checkForUser(repo, username, { accessToken: this.accessToken });
};

/**
 *
 */
 GitHubRepoService.prototype.getCollaborators = function(repo) {
  return gittercat.repoCollaborator.list(repo, { accessToken: this.accessToken });
};

/**
 *
 */
 GitHubRepoService.prototype.getCommits = function(repo, options) {
  return gittercat.repoCommits.list(repo, { firstPageOnly: options.firstPage, accessToken: this.accessToken });
};


/**
 *  Returns repo stargazers
 */
 GitHubRepoService.prototype.getStargazers = function(repo) {
  return gittercat.starring.listForRepo(repo, { accessToken: this.accessToken });
};

/**
 * Returns a promise of the issues for a repo
 */
GitHubRepoService.prototype.getIssues = function(repo) {
  return gittercat.issues.get(repo, { query: { state: 'all' }, accessToken: this.accessToken })
    .then(function(returnedIssues) {
      var issues = [];
      returnedIssues.forEach(function(issue) {
        issues[issue.number] = issue;
      });
      return issues;
    });
};


GitHubRepoService.prototype.getRecentlyStarredRepos = function() {
  return gittercat.starring.listForAuthUser({ firstPageOnly: true, query: { per_page: 100 }, accessToken: this.accessToken });
};

GitHubRepoService.prototype.getWatchedRepos = function() {
  return gittercat.watching.listForAuthUser({ accessToken: this.accessToken });
};

/** TODO: deprecated */
GitHubRepoService.prototype.getReposForUser = function(username, options) {
  return gittercat.repo.listForUser(username, { firstPageOnly: options && options.firstPage,  accessToken: this.accessToken });
};


module.exports = wrap(GitHubRepoService, function() {
  return [this.accessToken || ''];
});
