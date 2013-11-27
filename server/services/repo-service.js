/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GithubUser      = require("./github/github-user-service");
var GithubOrg       = require("./github/github-org-service");
var Q               = require('q');

/**
 * Gets a list of repos for a user
 * @returns The promise of a list of repos for the user
 */
exports.getReposForUser = function(user) {

  var gHuser  = new GithubUser(user);
  var gHorg   = new GithubOrg(user);

  // Fetch all user repos and repos of the orgs he belongs to.
  return Q.all([
      gHuser.getRepos(),
      gHuser.getOrgs()
        .then(function(orgs) {
          return Q.all(orgs.map(function(org) {
            return gHorg.getRepos(org.login);
          }));
        })
    ]).spread(function(userRepos, orgsWithRepos) {

      // Merge stuff together
      var userAdminRepos  = userRepos.filter(function(r) {
        return r.permissions.admin;
      });

      var orgRepos = orgsWithRepos.reduce(function(memo, org) { memo.push.apply(memo, org); return memo; }, []);
      var pushableOrgRepos = orgRepos.filter(function(r) {
        return r.permissions.admin;
      });

      userAdminRepos.push.apply(userAdminRepos, pushableOrgRepos);

      userAdminRepos.sort(function(a,b) { return Date.parse(b.pushed_at) - Date.parse(a.pushed_at); });

      return userAdminRepos;
    });
};