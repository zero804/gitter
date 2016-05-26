"use strict";

var RepoService = require('gitter-web-github').GitHubRepoService;
var StatusError = require('statuserror');

module.exports = function(req, res, next) {
  var repoName = req.query.repo ? String(req.query.repo) : null;
  
  if (!repoName) return next(new StatusError(400, 'repo parameter required'));
  var repoService = new RepoService(req.user);

  repoService.getRepo(repoName)
  .then(function(repo) {
    res.send(repo);
  }, next);
};
