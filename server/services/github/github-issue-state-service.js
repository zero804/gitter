/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');
var wrap = require('./github-cache-wrapper');
var createClient = require('./github-client');
var badCredentialsCheck = require('./bad-credentials-check');

function GitHubIssueStateService(user) {
  this.user = user;
  this.client = createClient.full(user);
}

GitHubIssueStateService.prototype.getIssueState = function(repo, issueNumber) {
  var d = Q.defer();

  var ghissue = this.client.issue(repo, issueNumber);
  ghissue.info(createClient.makeResolver(d));

  return d.promise
    .then(function(issue) {
      if(!issue) return '';
      return issue.state;
    })
    .fail(badCredentialsCheck)
    .fail(function(err) {
      if(err.statusCode === 404) return '';
      throw err;
    });
};

module.exports = wrap(GitHubIssueStateService, function() {
  return ['']; // Cache across all users NB NB NB NB
});

