"use strict";

var Promise = require('bluebird');
var GithubRepo = require('gitter-web-github').GitHubRepoService;
var securityDescriptorService = require('gitter-web-permissions/lib/security-descriptor-service');
var isGitHubUser = require('gitter-web-identity/lib/is-github-user');

function applyFilters(array, filters) {
  // Filter out what needs filtering out
  return filters.reduce(function(memo, filter) {
      return memo.filter(filter);
    }, array);
}

/**
 * Gets a list of repos for a user
 * @returns The promise of a list of repos for the user
 */
function getReposForUser(user, options) {
  if(!options) options = {};
  var adminAccessOnly = 'adminAccessOnly' in options ? options.adminAccessOnly : false;

  // TODO: Move this (saving Twitter users from 401 signout (see badCredentialsCheck))
  if(!isGitHubUser(user)) {
    return Promise.resolve([]);
  }

  var ghRepo = new GithubRepo(user);

  return ghRepo.getAllReposForAuthUser()
    .then(function(userRepos) {
      var repoFilters = [];

      if(adminAccessOnly) {
        repoFilters.push(function(r) { return r.permissions.admin; });
      }

      // Filter out what needs filtering out
      var filteredUserRepos = applyFilters(userRepos, repoFilters);
      filteredUserRepos.sort(function(a,b) { return Date.parse(b.pushed_at) - Date.parse(a.pushed_at); });

      return filteredUserRepos;
    });
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
      return securityDescriptorService.getUsedLinkPaths('GH_REPO', linkPaths);
    })
    .then(function(usedLinkPaths) {
      return this.repos.filter(function(repo) {
        return !usedLinkPaths[repo.full_name];
      });
    });
}

module.exports = {
  getReposForUser: Promise.method(getReposForUser),
  getUnusedReposForUser: Promise.method(getUnusedReposForUser)
};
