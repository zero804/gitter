"use strict";


var env = require('gitter-web-env');
var logger = env.logger;
var stats = env.stats;
var Promise = require('bluebird');
var GithubIssueStateService = require('gitter-web-github').GitHubIssueStateService;
var StatusError = require('statuserror');

var EXPIRES_SECONDS = 180;
var EXPIRES_MILLISECONDS = EXPIRES_SECONDS * 1000;

function getRepoAndIssueNumber(query) {
  var repo = query.r ? String(query.r) : undefined;
  var issueNumber = query.i ? String(query.i) : undefined;

  // The new way...
  if (repo && issueNumber) {
    return {
      repo: repo,
      issueNumber: issueNumber
    }
  }

  // The deprecated way...
  var q = query.q ? String(query.q) : undefined;

  var parts = q.split('/');
  if(parts.length === 3) {
    return {
      repo: parts[0] + '/' + parts[1],
      issueNumber: parts[2]
    }
  }

  return null;
}

module.exports = function(req, res, next) {
  var repoAndIssue = getRepoAndIssueNumber(req.query);

  if (!repoAndIssue) {
    return next(new StatusError(400));
  }

  var service = new GithubIssueStateService(req.user);
  return service.getIssueState(repoAndIssue.repo, repoAndIssue.issueNumber)
    .then(function(results) {
      res.setHeader('Cache-Control', 'public, max-age=' + EXPIRES_SECONDS);
      res.setHeader('Expires', new Date(Date.now() + EXPIRES_MILLISECONDS).toUTCString());

      res.send([results]);
    })
    .catch(function(e) {
      stats.eventHF('issue.state.query.fail', 1, 1);

      logger.warn('Unable to obtain issue state for ' + repoAndIssue.repo + '/' + repoAndIssue.issueNumber + ': ' + e,
          { exception: e });
      throw e;
    })
    .catch(next);


};
