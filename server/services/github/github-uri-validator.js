/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GitHubOrgService = require('./github-org-service');
var GitHubRepoService = require('./github-repo-service');
var Q = require('q');
var winston = require('winston');

/**
 * Given a uri, is it a valid repo or valid org?
 * @returns promise of ORG / REPO or null
 */
function validateUri(user, uri) {
  winston.verbose('Attempting to validate uri ' + uri + ' with GitHub');
  var parts = uri.split('/');
  if(parts.length == 1) {
    /** Its a user or org.
     *  We only need to check if it's an org because we'll
     *  already know if its a registered user and won't be
     *  in this code
     **/
    var orgService = new GitHubOrgService(user);
    return orgService.getOrg(uri)
      .then(function(org) {
        winston.verbose('URI ' + uri + ' is an org?' + !!org);

        if(org) return ['ORG', org.login, org.name];

        return [];
      });
  }

  if(parts.length == 2) {
    /* Its a repo */
    var repoService = new GitHubRepoService(user);
    return repoService.getRepo(uri)
      .then(function(repo) {
        winston.verbose('URI ' + uri + ' is a repo?' + !!repo);

        if(repo) return ['REPO', repo.full_name, repo.description];

        return [];
      });
  }

  return Q.resolve();
}

module.exports = validateUri;
