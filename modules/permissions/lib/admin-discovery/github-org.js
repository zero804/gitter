'use strict';

var Promise = require('bluebird');
var GitHubMeService = require('gitter-web-github').GitHubMeService;

function githubOrgAdminDiscovery(user) {
  var meService = new GitHubMeService(user);
  return meService.getOrgs()
    .then(function(orgs) {
      if (!orgs || !orgs.length) return;

      return {
        type: 'GH_ORG',
        linkPath: orgs.map(function(org) {
          return org.login;
        })
      }
    });
}

module.exports = Promise.method(githubOrgAdminDiscovery);
