"use strict";

var wrap = require('./github-cache-wrapper');
var tentacles = require('./tentacles-client');
var userTokenSelector = require('./user-token-selector').full;

function GitHubIssueStateService(user) {
  this.user = user;
  this.accessToken = userTokenSelector(user);
}

GitHubIssueStateService.prototype.getIssueState = function(repo, issueNumber) {
  return tentacles.issue.get(repo, issueNumber, { accessToken: this.accessToken })
    .then(function(issue) {
      if (!issue) return '';
      return issue.state;
    });
};

module.exports = wrap(GitHubIssueStateService, function() {
  return ['']; // Cache across all users NB NB NB NB
});
