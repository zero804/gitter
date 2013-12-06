/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var RepoService =  require('../../services/github/github-repo-service');
var winston = require('winston');

function getEightSuggestedIssues(allIssues) {
  return allIssues.slice(0, 8).sort(function(issueA, issueB) {
    return issueB.number - issueA.number;
  });
}

function getTopEightMatchingIssues(allIssues, term) {
  var matches = allIssues.filter(function(issue) {
    return (''+issue.number).indexOf(term) === 0;
  }).sort(function(issueA, issueB) {
    return issueA.number - issueB.number;
  }).slice(0, 8);
  return matches;
}

module.exports = {
  index: function(req, res) {
    if(req.troupe.githubType != 'REPO') return res.send([]);

    var term = req.query.q || '';
    var service = new RepoService(req.user);
    var repoName = req.troupe.uri;

    service.getIssues(repoName).then(function(issues) {
      var matches = term.length ? getTopEightMatchingIssues(issues, term) : getEightSuggestedIssues(issues);
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
        res.send(issue);
      }
    }).fail(function(err) {
      winston.err('failed to issue '+issueNumber+' for '+repoName, err);
      res.send(404);
    });
  }
};
