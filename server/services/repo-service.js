'use strict';

var Promise = require('bluebird');
var GithubRepo = require('gitter-web-github').GitHubRepoService;
var isGitHubUser = require('gitter-web-identity/lib/is-github-user');

/**
 * Gets a list of repos for a user
 * @returns The promise of a list of repos for the user
 */
function getReposForUser(user, options) {
  if (!options) options = {};

  // TODO: Move this (saving Twitter users from 401 signout (see badCredentialsCheck))
  if (!isGitHubUser(user)) {
    return Promise.resolve([]);
  }

  var ghRepo = new GithubRepo(user);
  return ghRepo.getAllReposForAuthUser();
}

/**
 *
 * @returns The promise of a list of repos for the user
 */
function getAdminReposForUser(user, options) {
  options = options || {};

  return getReposForUser(user, options).then(function(repos) {
    return repos.filter(function(repo) {
      return repo.permissions && (repo.permissions.push || repo.permissions.admin);
    });
  });
}

module.exports = {
  getReposForUser: Promise.method(getReposForUser),
  getAdminReposForUser: Promise.method(getAdminReposForUser)
};
