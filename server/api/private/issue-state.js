/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');

var GithubIssueStateService = require('../../services/github/github-issue-state-service');

module.exports =  function(req, res, next) {
  var issues = req.query.q;

  if(!Array.isArray(issues)) issues = [issues];

  var service = new GithubIssueStateService(req.user);

  Q.all(issues.map(function(issue) {
    var parts = issue.split('/');
    if(parts.length !== 3) return '';

    return service.getIssueState(parts[0] + '/' + parts[1], parts[2]);
  })).then(function(results) {
    res.send(results);
  }).fail(next);

};

