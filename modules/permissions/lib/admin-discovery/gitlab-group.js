'use strict';

const identityService = require('gitter-web-identity');
const { GitLabGroupService } = require('gitter-web-gitlab');

// https://docs.gitlab.com/ee/api/access_requests.html
const MAINTAINER_ACCESS_LEVEL = 40;

/*
 * Finds URIs and external IDs for all GitLab groups that the user is a maintainer of
 */
async function gitlabGroupAdminDiscovery(user) {
  const gitLabIdentity = await identityService.getIdentityForUser(user, 'gitlab');
  if (!gitLabIdentity) {
    return;
  }

  const gitlabGroupService = new GitLabGroupService(user);
  const groups = await gitlabGroupService.getGroups({ min_access_level: MAINTAINER_ACCESS_LEVEL });

  const linkPaths = groups.map(group => group.uri);
  const externalIds = groups.map(group => group.id);

  return {
    type: 'GL_GROUP',
    linkPath: linkPaths,
    externalId: externalIds.length ? externalIds : null
  };
}

module.exports = gitlabGroupAdminDiscovery;
