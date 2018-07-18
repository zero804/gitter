"use strict";

var RepoService = require('gitter-web-github').GitHubRepoService;
var StatusError = require('statuserror');

module.exports = function(req, res, next) {
  var repoName = req.query.repo ? String(req.query.repo) : null;

  if (!repoName) return next(new StatusError(400, 'repo parameter required'));
  var repoService = new RepoService(req.user);

  return repoService.getRepo(repoName)
    .then(function(repo) {
      if(!repo) return next(new StatusError(204, 'repo not found'));
      res.send(repo);
    }, next);
};
