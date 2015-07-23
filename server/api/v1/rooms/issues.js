/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var RepoService =  require('gitter-web-github').GitHubRepoService;
var GitHubIssueService =  require('gitter-web-github').GitHubIssueService;
var processChat = require('../../../utils/markdown-processor');
var StatusError = require('statuserror');

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
  index: function(req, res, next) {
    var query = req.query || {};
    var repoName = query.repoName || (req.troupe.githubType === 'REPO' && req.troupe.uri);

    if(!repoName) return res.send([]);

    var issueNumber = query.issueNumber || '';
    var service = new RepoService(req.user);

    service.getIssues(repoName)
      .then(function(issues) {
        var matches = issueNumber.length ? getTopEightMatchingIssues(issues, issueNumber) : getEightSuggestedIssues(issues);
        res.send(matches);
      })
      .fail(next);
  },

  show: function(req, res, next) {
    if(req.troupe.githubType != 'REPO') return res.sendStatus(404);

    var issueNumber = req.params.issue;
    var repoName = req.troupe.uri;

    var issueService = new GitHubIssueService(req.user);
    issueService.getIssue(repoName, issueNumber)
      .then(function(issue) {
        if(!issue) {
          throw new StatusError(404);
        }

        if(req.query.renderMarkdown && issue.body) {
          return processChat(issue.body)
            .then(function(result) {
              issue.body_html = result.html;
              res.send(issue);
            });
        }

        res.send(issue);

      })
      .fail(next);
  }
};
