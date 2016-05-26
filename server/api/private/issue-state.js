"use strict";


var env = require('gitter-web-env');
var logger = env.logger;
var stats = env.stats;
var Promise = require('bluebird');
var GithubIssueStateService = require('gitter-web-github').GitHubIssueStateService;
var StatusError = require('statuserror');

var EXPIRES_SECONDS = 180;
var EXPIRES_MILLISECONDS = 180 * 1000;

module.exports = function(req, res, next) {
  var issue = req.query.q;

  return Promise.try(function() {
      if (!issue) throw new StatusError(400);

      var parts = issue.split('/');
      if(parts.length !== 3) throw new StatusError(400);

      var service = new GithubIssueStateService(req.user);
      return service.getIssueState(parts[0] + '/' + parts[1], parts[2]);
    })
    .then(function(results) {
      res.setHeader('Cache-Control', 'public, max-age=' + EXPIRES_SECONDS);
      res.setHeader('Expires', new Date(Date.now() + EXPIRES_MILLISECONDS).toUTCString());

      res.send([results]);
    })
    .catch(function(e) {
      stats.eventHF('issue.state.query.fail', 1, 1);

      logger.warn('Unable to obtain issue state for ' + issue + ': ' + e,
          { exception: e });

      next(e);
      return null;
    });

};
