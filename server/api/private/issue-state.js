"use strict";

var Promise = require('bluebird');
var winston = require('../../utils/winston');
var GithubIssueStateService = require('gitter-web-github').GitHubIssueStateService;

var EXPIRES_SECONDS = 180;
var EXPIRES_MILLISECONDS = 180 * 1000;

module.exports =  function(req, res, next) {
  var issues = req.query.q;

  if(!Array.isArray(issues)) issues = [issues];

  var service = new GithubIssueStateService(req.user);

  Promise.all(issues.map(function(issue) {
    var parts = issue.split('/');
    if(parts.length !== 3) return '';

    return service.getIssueState(parts[0] + '/' + parts[1], parts[2])
      .timeout(2500)
      .catch(function(err) {

        winston.warn('Unable to obtain issue state for ' +
            parts[0] + '/' + parts[1] + '#' +parts[2] + ': ' + err,
            { exception: err });

        return '';
      });
  })).then(function(results) {
    res.setHeader('Cache-Control', 'public, max-age=' + EXPIRES_SECONDS);
    res.setHeader('Expires', new Date(Date.now() + EXPIRES_MILLISECONDS).toUTCString());

    res.send(results);
  }).catch(next);

};
