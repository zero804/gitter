"use strict";

var GitHubOrgService  = require('./github-org-service');
var GitHubRepoService = require('./github-repo-service');
var Promise           = require('bluebird');
var debug             = require('debug')('gitter:app:github:github-uri-validator');

function validateOrgUri(user, uri) {
  debug("validateOrgUri: %s", uri);
  var orgService = new GitHubOrgService(user);
  return orgService.getOrg(uri)
    .then(function(org) {
      if(!org) return;

      return {
        type: 'ORG',
        uri: org.login,
        description: org.name,
        githubId: parseInt(org.id, 10) || undefined
      };

    });
}

function validateRepoUri(user, uri) {
  debug("validateRepoUri: %s", uri);

  var repoService = new GitHubRepoService(user);
  return repoService.getRepo(uri)
    .then(function(repo) {
      if (!repo) return;

      return {
        type: 'REPO',
        uri: repo.full_name,
        description: repo.description,
        githubId: parseInt(repo.id, 10) || undefined,
        security: repo.private ? 'PRIVATE' : 'PUBLIC'
      };
    });
}

/**
 * Given a uri, is it a valid repo or valid org?
 * @returns promise of ORG / REPO or null
 */
module.exports = Promise.method(function validateUri(user, uri) {
  debug("validateUri: %s", uri);

  var parts = uri.split('/');
  if(parts.length === 1) {
    /** Its a user or org.
     *  We only need to check if it's an org because we'll
     *  already know if its a registered user and won't be
     *  in this code
     **/
    return validateOrgUri(user, uri);

  }

  if(parts.length === 2) {
    /* Its a repo or a channel */
    return validateRepoUri(user, uri);
  }

  return;
});
