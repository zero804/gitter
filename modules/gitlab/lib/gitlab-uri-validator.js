'use strict';

const GitLabGroupService = require('./group-service');
const GitLabUserService = require('./user-service');
const debug = require('debug')('gitter:app:github:github-uri-validator');

/**
 * Given a uri, is it a valid repo or valid org?
 * @returns promise of ORG / REPO or null
 */
async function validateGitlabUri(user, uri) {
  debug('validateUri: %s', uri);

  try {
    debug('validateUri -> user: %s', uri);
    const userService = new GitLabUserService(user);
    const gitlabUser = await userService.getUserByUsername(uri);

    return {
      type: 'USER',
      uri: gitlabUser.username,
      description: gitlabUser.name,
      externalId: parseInt(gitlabUser.id, 10) || undefined
    };
  } catch (err) {
    // no-op
  }

  try {
    debug('validateUri -> group: %s', uri);
    const groupService = new GitLabGroupService(user);
    const group = await groupService.getGroup(uri);

    return {
      type: 'GROUP',
      uri: group.uri,
      description: group.name,
      externalId: parseInt(group.id, 10) || undefined
    };
  } catch (err) {
    // no-op
  }

  // TODO: GL_PROJECT
  try {
    debug('validateUri -> project: %s', uri);
    throw new Error('validateProjectUri: GL_PROJECT not implemented yet');
  } catch (err) {
    // no-op
  }

  return null;
}

module.exports = validateGitlabUri;
