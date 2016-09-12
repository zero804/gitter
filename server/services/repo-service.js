"use strict";

var Promise = require('bluebird');
var GithubRepo = require('gitter-web-github').GitHubRepoService;
var securityDescriptorFinder = require('gitter-web-permissions/lib/security-descriptor/finder');
var isGitHubUser = require('gitter-web-identity/lib/is-github-user');

/**
 * Gets a list of repos for a user
 * @returns The promise of a list of repos for the user
 */
function getReposForUser(user, options) {
  if(!options) options = {};

  // TODO: Move this (saving Twitter users from 401 signout (see badCredentialsCheck))
  if(!isGitHubUser(user)) {
    return Promise.resolve([]);
  }

  var ghRepo = new GithubRepo(user);
  return ghRepo.getAllReposForAuthUser();
}

/**
 * Gets a list of repos for a user that aren't being used by a group or a room
 * yet.
 * @returns The promise of a list of repos for the user
 */
function getUnusedReposForUser(user, options) {
  options = options || {};

  return getReposForUser(user, options)
    .bind({
      repos: null
    })
    .then(function(repos) {
      this.repos = repos;

      var linkPaths = repos.map(function(repo) {
        return repo.full_name;
      });
      return securityDescriptorFinder.getUsedLinkPaths('GH_REPO', linkPaths);
    })
    .then(function(usedLinkPaths) {
      return this.repos.filter(function(repo) {
        return !usedLinkPaths[repo.full_name];
      });
    });
}

/**
 *
 * @returns The promise of a list of repos for the user
 */
function getAdminReposForUser(user, options) {
  options = options || {};

  return getReposForUser(user, options)
    .then(function(repos) {
      return repos.filter(function(repo) {
        return repo.permissions && (repo.permissions.push || repo.permissions.admin);
      });
    });
}

module.exports = {
  getReposForUser: Promise.method(getReposForUser),
  getUnusedReposForUser: Promise.method(getUnusedReposForUser),
  getAdminReposForUser: Promise.method(getAdminReposForUser)
};
