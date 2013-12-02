/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');
var url = require('url');
var parser = require('parse-links');
var autopage = require('auto-page');
var wrap = require('./github-cache-wrapper');
var createClient = require('./github-client');

function GitHubIssueService(user) {
  this.user = user;
  this.client = createClient(user);
}


/**
 * Returns the information about the specified repo
 * @return the promise of information about a repo
 */
GitHubIssueService.prototype.getRepo = function(repo) {
  var ghrepo = this.client.repo(repo);
  var d = Q.defer();
  ghrepo.info(d.makeNodeResolver());
  return d.promise
    .fail(function(err) {
      if(err.statusCode === 404) return;
      throw err;
    });
};

function getIssuesWithState(repo, state) {
  return autopage(function(pageNumber, callback) {
    var config = {
      page: pageNumber,
      per_page: 100,
      state: state
    };
    repo.issues(config, function(err, data, header) {
      var result = {
        body: data,
        header: header
      };
      callback(err, result);
    });
  });
}

/**
 * Returns a promise of the issues for a repo
 */
GitHubIssueService.prototype.getIssues = function(repoName) {
  var repo = this.client.repo(repoName);
  return Q.all([
    getIssuesWithState(repo, 'open'),
    getIssuesWithState(repo, 'closed')
    ]).spread(function(openIssues, closedIssues) {
      return openIssues.concat(closedIssues);
    });
};

// module.exports = GitHubIssueService;
module.exports = wrap(GitHubIssueService, function() {
  return [this.user && this.user.githubToken || ''];
});
