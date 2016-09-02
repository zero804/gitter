"use strict";


var env = require('gitter-web-env');
var logger = env.logger;
var stats = env.stats;
var Promise = require('bluebird');
var GithubIssueStateService = require('gitter-web-github').GitHubIssueStateService;
var roomRepoService = require('../../../services/room-repo-service');
var loadTroupeFromParam = require('./load-troupe-param');
var StatusError = require('statuserror');

var EXPIRES_SECONDS = 180;
var EXPIRES_MILLISECONDS = 180 * 1000;

module.exports = {
  id: 'issue-state',

  index: function(req) {
    var issue = req.query.q;

    return Promise.try(function() {
      if (!issue) throw new StatusError(400);
      var parts = issue && issue.split('/');
      if(parts.length > 3) throw new StatusError(400);

      var issueNumber = parts[0];
      if(parts.length === 3) {
        issueNumber = parts[2];
      }

      return Promise.resolve().then(function() {
          if(parts.length === 1) {
            // Resolve the repo name from the room
            return loadTroupeFromParam(req)
              .then(function(troupe) {
                return roomRepoService.findAssociatedGithubRepoForRoom(troupe);
              });
          }

          return parts[0] + '/' + parts[1];
        })
        .then(function(repo) {
            var service = new GithubIssueStateService(req.user);
            return service.getIssueState(repo, issueNumber);
        })
        .then(function(results) {
          return [results];
        })
    })
    .catch(function(e) {
      stats.eventHF('issue.state.query.fail', 1, 1);

      logger.warn('Unable to obtain issue state for ' + issue + ': ' + e,
          { exception: e });

      throw e;
    });
  }
};
