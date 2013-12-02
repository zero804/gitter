/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var github = require('octonode');
var publicClient = github.client();
var Q = require('q');
var assert = require('assert');
var url = require('url');
var parser = require('parse-links');
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
  return d.promise
    .fail(function(err) {
      if(err.statusCode === 404) return;
      throw err;
    });
};

function getIssuePage(repo, number, state) {
  var d = Q.defer();
  repo.issues({
    page: number,
    per_page: 100,
    state: state
  }, d.makeNodeResolver());
  return d.promise.then(function(page) {
    return {
      issues: page[0].map(function(issue) {
        return {
          number: issue.number,
          title: issue.title
        };
      }),
      header: page[1]
    };
  });
}

function getLastPageNumber(header) {
  var lastPage = 1;
  if(header.link) {
    var links = parser(header.link);
    if(links.last) {
      lastPage = url.parse(links.last, true).query.page;
    }
  }

  return lastPage;
}

function getIssuesWithState(repo, state) {
  return getIssuePage(repo, 1, state)
    .then(function(page) {
      var lastPageNumber = getLastPageNumber(page.header);
      var promises = [page];
      for (var i = 2; i <= lastPageNumber; i++) {
        promises.push(getIssuePage(repo, i, state));
      }
      return promises;
    })
    .then(function(promises) {
      return Q.all(promises);
    })
    .then(function(pages) {
      var issues = pages.map(function(page) {
        return page.issues;
      }).reduce(function(previousIssues, currentIssues) {
        return previousIssues.concat(currentIssues);
      }, []);
      return issues;
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