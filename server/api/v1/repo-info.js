/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/* globals unescape:true */
"use strict";

var RepoService = require('gitter-web-github').GitHubRepoService;

module.exports =  function(req, res, next) {
  var repoName = unescape(req.query.repo); // TODO: why unescape?

  var repoService = new RepoService(req.user);

  repoService.getRepo(repoName)
  .then(function(repo) {
    res.send(repo);
  }, next);
};
