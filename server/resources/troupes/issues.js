/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var RepoService =  require('../../services/github/github-repo-service');
var converter = require('../../utils/process-chat');
var winston = require('winston');

function getEightSuggestedIssues(allIssues) {
  return allIssues.slice(0, 8).sort(function(issueA, issueB) {
    return issueB.number - issueA.number;
  }).map(trimDownIssue);
}

function getTopEightMatchingIssues(allIssues, term) {
  var matches = allIssues.filter(function(issue) {
    return (''+issue.number).indexOf(term) === 0;
  }).sort(function(issueA, issueB) {
    return issueA.number - issueB.number;
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
  index: function(req, res) {
    var query = req.query || {};
    var repoName = query.repoName || (req.troupe.githubType === 'REPO' && req.troupe.uri);

    if(!repoName) return res.send([]);

    var issueNumber = query.issueNumber || '';
    var service = new RepoService(req.user);

    service.getIssues(repoName).then(function(issues) {
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

    service.getIssues(repoName).then(function(issues) {
      var issue = issues[issueNumber-1];
      if(!issue) {
        res.send(404);
      } else {
        if(req.query.renderMarkdown && issue.body){
          issue.body_html = converter(issue.body).html;
        }

        res.send(issue);
      }
    }).fail(function(err) {
      winston.err('failed to issue '+issueNumber+' for '+repoName, err);
      res.send(404);
    });
  }
};
