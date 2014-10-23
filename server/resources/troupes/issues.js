/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var RepoService =  require('../../services/github/github-repo-service');
var processChat = require('../../utils/markdown-processor');
var winston = require('../../utils/winston');
var _ = require('underscore');

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
  index: function(req, res) {
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
      .fail(function(err) {
        winston.err('failed to find issues for ' + repoName, err);
        res.send([]);
      });
  },

  show: function(req, res) {
    if(req.troupe.githubType != 'REPO') return res.send(404);

    var issueNumber = req.params.issue;
    var service = new RepoService(req.user);
    var repoName = req.troupe.uri;

    service.getIssues(repoName)
      .then(function(issues) {
        // TODO: this needs urgent fixing!
        var issue = _.find(issues, function(issue) {
          return issue && '' + issue.number === issueNumber;
        });

        if(!issue) {
          res.send(404);
          return;
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
      .fail(function(err) {
        winston.err('failed to issue '+issueNumber+' for '+repoName, err);
        res.send(404);
      });
  }
};
