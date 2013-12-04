/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var RepoService =  require('../../services/github/github-repo-service');

function getEightSuggestedIssues(allIssues) {
  return allIssues.slice(0, 8);
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
  index: function(req, res, next) {
    if(req.troupe.githubType != 'REPO') return res.send([]);

    var term = req.query.q || '';
    var service = new RepoService(req.user);
    var repoName = req.troupe.uri;

    service.getIssues(repoName).then(function(issues) {
      var matches = term.length ? getTopEightMatchingIssues(issues, term) : getEightSuggestedIssues(issues);
      res.send(matches);
    })
    .fail(next);
  }
};
