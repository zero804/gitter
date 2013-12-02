/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var RepoService = require('../../services/github/github-repo-service');

module.exports =  function(req, res, next) {
  var repoName = unescape(req.query.repo);

  var repoService = new RepoService(req.user);

  repoService.getRepo(repoName)
  .then(function(repo) {
    res.send(repo);
  }, next);
};

