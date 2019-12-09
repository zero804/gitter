'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const identityService = require('gitter-web-identity');
const { GitLabGroupService } = require('gitter-web-gitlab');

async function gitlabGroupAdminDiscovery(user) {
  const gitLabIdentity = await identityService.getIdentityForUser(user, 'gitlab');
  if (!gitLabIdentity) {
    return;
  }

  const gitlabGroupService = new GitLabGroupService(this.user);
  const groups = await gitlabGroupService.getGroups();

  if (!groups || !groups.length) {
    return;
  }

  const linkPaths = _.map(groups, function(group) {
    return group.uri;
  });

  const externalIds = _.map(groups, function(group) {
    return group.id;
  });

  return {
    type: 'GL_GROUP',
    linkPath: linkPaths,
    externalId: externalIds.length ? externalIds : null
  };
}

module.exports = Promise.method(gitlabGroupAdminDiscovery);
