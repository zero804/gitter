"use strict";

var Promise = require('bluebird');
var RepoService = require('gitter-web-github').GitHubRepoService;
var GitHubIssueService = require('gitter-web-github').GitHubIssueService;
var processChat = require('../../../utils/markdown-processor');
var StatusError = require('statuserror');
var loadTroupeFromParam = require('./load-troupe-param');
var securityDescriptorUtils = require('gitter-web-permissions/lib/security-descriptor-utils');

function getEightSuggestedIssues(issues) {
  var suggestedIssues = [];
  for(var i = issues.length - 1; i >= 0 && suggestedIssues.length < 8; i--) {
    var issue = issues[i];
    if(issue) {
      suggestedIssues.push(issue);
    }
  }

  return suggestedIssues.map(trimDownIssue);
}

function getTopEightMatchingIssues(issues, term) {
  var matches = issues.filter(function(issue) {
    return issue && (''+issue.number).indexOf(term) === 0;
  }).slice(0, 8).map(trimDownIssue);
  return matches;
}

function trimDownIssue(issue) {
  return {
    title: issue.title,
    number: issue.number
  };
}

module.exports = {
  id: 'issue',

  index: function(req) {
    var repoName = req.query.repoName;
    var issueNumber = req.query.issueNumber || '';

    return Promise.try(function() {
        if (repoName) return repoName;

        // Resolve the repo name from the room
        return loadTroupeFromParam(req)
          .then(function(troupe) {
            return securityDescriptorUtils.getLinkPathIfType('GH_REPO', troupe);
          });
      })
      .then(function(repoName) {
        if (!repoName) return [];
        var repoService = new RepoService(req.user);

        return repoService.getIssues(repoName, {
            firstPageOnly: !issueNumber
          })
          .then(function(issues) {
            var matches = issueNumber ? getTopEightMatchingIssues(issues, issueNumber) : getEightSuggestedIssues(issues);
            return matches;
          });
        });
  },

  show: function(req) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        var repoUri = securityDescriptorUtils.getLinkPathIfType('GH_REPO', troupe);
        if(!repoUri) throw new StatusError(404);

        var issueNumber = req.params.issue;

        var issueService = new GitHubIssueService(req.user);
        return issueService.getIssue(repoUri, issueNumber);
      })
      .then(function(issue) {
        if(!issue) throw new StatusError(404);

        if(req.query.renderMarkdown && issue.body) {
          return processChat(issue.body)
            .then(function(result) {
              issue.body_html = result.html;
              return issue;
            });
        }

        return issue;
      });
  }
};
