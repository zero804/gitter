"use strict";

var wrap = require('./github-cache-wrapper');
var tentacles = require('./tentacles-client');
var userTokenSelector = require('./user-token-selector').full;

function GitHubIssueService(user) {
  this.user = user;
  this.accessToken = userTokenSelector(user);
}

 GitHubIssueService.prototype.getIssue = function(repo, issueNumber) {
  return tentacles.issue.get(repo, issueNumber, { accessToken: this.accessToken });
};


module.exports = wrap(GitHubIssueService, function() {
  return [this.accessToken || ''];
});
