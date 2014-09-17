/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var createClient = require('./github-client');
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

module.exports = function(repoName) {
  return getRepoInfo(repoName).then(function(repoInfo) {
    return repoInfo.description;
  });
};
