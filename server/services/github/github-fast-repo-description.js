/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var createClient = require('./github-client');
var wrapper = require('../../utils/module-cache-wrapper');
var badCredentialsCheck = require('./bad-credentials-check');
var Q = require('q');

function getRepoInfo(repoName) {
  var client = createClient.full();
  var ghrepo = client.repo(repoName);
  var d = Q.defer();
  ghrepo.info(createClient.makeResolver(d));
  return d.promise
    .fail(badCredentialsCheck)
    .fail(function(err) {
      if(err.statusCode == 404) return;
      throw err;
    });
}

function getDescription(repoName) {
  return getRepoInfo(repoName).then(function(repoInfo) {
    return repoInfo.description;
  });
}

module.exports = wrapper('github-fast-repo-description', getDescription);
