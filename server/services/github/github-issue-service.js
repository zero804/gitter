/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var github = require('octonode');
var publicClient = github.client();
var Q = require('q');
var assert = require('assert');
var parser = require('parse-links');
var url = require('url');

function GitHubIssueService(user) {
  assert(!user || user.githubToken, 'User must have a githubToken');

  this.user = user;
  this.client = user ? github.client(user.githubToken) : publicClient;
}

function getFirstPage(repo) {
  return getIssuePage(repo, 1);
}

function getIssuePage(repo, number) {
  var d = Q.defer();
  repo.issues(number, 100, d.makeNodeResolver());
  return d.promise.then(function(page) {
    return {
      issues: page[0],
      header: page[1]
    };
  });
}

function getLastPageNumber(header) {
  var links = parser(header.link);
  var last = url.parse(links.last, true);
  return last.query.page;
}

/**
 * Returns a promise of the open issues for a repo
 */
GitHubIssueService.prototype.getIssues = function() {
  var repo = this.client.repo('twbs/bootstrap');
  return getFirstPage(repo)
    .then(function(page) {
      var lastPageNumber = getLastPageNumber(page.header);
      var promises = [page];
      for (var i = 2; i <= lastPageNumber; i++) {
        promises.push(getIssuePage(repo, i));
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
};

module.exports = GitHubIssueService;
