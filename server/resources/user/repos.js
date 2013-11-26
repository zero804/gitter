/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restSerializer  = require("../../serializers/rest-serializer");
var GithubUser      = require("../../services/github/github-user-service");
var GithubOrg       = require("../../services/github/github-org-service");
var Q               = require('q');

module.exports = {
  index: function(req, res, next) {
    if (!req.user) return res.send(403);

    var gHuser  = new GithubUser(req.user);
    var gHorg   = new GithubOrg(req.user);

    // Fetch all user repos and repos of the orgs he belongs to.
    Q.all([
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

        //return userAdminRepos;
        var strategy = new restSerializer.GitHubRepoStrategy({currentUserId: req.user.id});

        restSerializer.serialize(userAdminRepos, strategy, function(err, serialized) {
          if(err) return next(err);
          res.send(serialized);
        });

      });

  }
};
