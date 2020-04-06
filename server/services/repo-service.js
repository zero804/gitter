'use strict';

const createTextFilter = require('text-filter');
var GithubRepo = require('gitter-web-github').GitHubRepoService;
const { GitLabProjectService } = require('gitter-web-gitlab');
var isGitHubUser = require('gitter-web-identity/lib/is-github-user');
const identityService = require('gitter-web-identity');
const {
  getAdminProjectsForUser
} = require('gitter-web-permissions/lib/admin-discovery/gitlab-project');

// https://docs.gitlab.com/ee/api/access_requests.html
const GUEST_ACCESS_LEVEL = 10;

/**
 * Gets a list of GitHub repos for a user
 * @returns The promise of a list of repos for the user
 */
async function _getGitHubReposForUser(user, { firstPageOnly = false } = {}) {
  const ghRepo = new GithubRepo(user);
  return ghRepo.getAllReposForAuthUser({ firstPageOnly }).map(repo => {
    repo.backend = 'github';
    return repo;
  });
}

/**
 * Gets a list of repos for a user
 * @returns The promise of a list of repos for the user
 */
async function getReposForUser(user) {
  if (isGitHubUser(user)) {
    return _getGitHubReposForUser(user);
  }

  const gitLabIdentity = await identityService.getIdentityForUser(
    user,
    identityService.GITLAB_IDENTITY_PROVIDER
  );
  if (gitLabIdentity) {
    const gitlabProjectService = new GitLabProjectService(user);
    return gitlabProjectService.getProjects({
      perPage: 100,
      min_access_level: GUEST_ACCESS_LEVEL
    });
  }

  return [];
}

/**
 * Fetches the first page of search results(repos for a user)
 * We only care about the first page of results because pagination
 & isn't support on the endpoint anyway(`/api/v1/user/:userId/repos?q=webapp&type=gitter&limit=10`)
 * @returns Promise returning repo search results for the user
 */
async function searchReposForUser(user, query) {
  if (isGitHubUser(user)) {
    // The GitHub API request doesn't actually search or filter repos.
    // We have to fetch them all then filter on our side
    // GitHub API notes:
    //  - The user repos endpoint doesn't have search by text query
    //  - The repo search endpoint doesn't have a filter for repos you have access to
    const githubRepos = await _getGitHubReposForUser(user, { firstPageOnly: true });

    return githubRepos.filter(createTextFilter({ query: query, fields: ['full_name'] }));
  }

  const gitLabIdentity = await identityService.getIdentityForUser(
    user,
    identityService.GITLAB_IDENTITY_PROVIDER
  );
  if (gitLabIdentity) {
    const gitlabProjectService = new GitLabProjectService(user);
    return await gitlabProjectService.getProjects({
      maxPages: 1,
      perPage: 100,
      min_access_level: GUEST_ACCESS_LEVEL,
      order_by: 'created_at',
      search: query
    });
  }

  return [];
}

/**
 *
 * @returns The promise of a list of repos for the user
 */
async function getAdminReposForUser(user) {
  if (isGitHubUser(user)) {
    const repos = await _getGitHubReposForUser(user);

    return repos.filter(function(repo) {
      if (repo) return repo.permissions && (repo.permissions.push || repo.permissions.admin);
    });
  }

  const gitLabIdentity = await identityService.getIdentityForUser(
    user,
    identityService.GITLAB_IDENTITY_PROVIDER
  );
  if (gitLabIdentity) {
    return getAdminProjectsForUser(user);
  }

  return [];
}

module.exports = {
  getReposForUser: getReposForUser,
  getAdminReposForUser: getAdminReposForUser,
  searchReposForUser
};
