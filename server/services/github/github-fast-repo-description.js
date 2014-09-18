/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var RepoService = require('./github-repo-service');
var wrapper = require('../../utils/module-cache-wrapper');

function getDescription(repoName) {
  var repoService = new RepoService();
  return repoService.getRepo(repoName).then(function(repo) {
    return repo.description;
  });
}

module.exports = wrapper('github-fast-repo-description', getDescription, { ttl: 20 });
