/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var repoService = require('./repo-service');
var persistence = require('./persistence-service');
var GithubUser  = require("./github/github-user-service");
var Q           = require('q');

exports.shouldUserBeTurnedAway = function(user) {
  /* If you're wearing the hat, you're always allowed in */
  if(user.permissions.createRoom) {
    return Q.resolve(true);
  }
  return repoService.getReposForUser(user)
    .then(function(repos) {

      /* If we do this operation in series to the getRepos
         we'll get a cached result. Faster + less api calls */
      var gHuser  = new GithubUser(user);
      return gHuser.getOrgs()
        .then(function(orgs) {
          return [repos, orgs];
        });
    })
    .spread(function(repos, orgs) {
      var repoSearchList = repos.map(function(r) { return { uri: r.full_name, type: 'REPO' }; });
      var orgSearchList = orgs.map(function(r) { return { uri: r.login, type: 'ORG' }; });

      var orTerms = repoSearchList.concat(orgSearchList).map(function(s) {
        return { githubType: s.type, uri: s.uri };
      });

      return persistence.Troupe.countQ({ $or: orTerms });
    })
    .then(function(count) {
      // If rooms exist, let the user in
      return count > 0;
    });

};