'use strict';

const debug = require('debug')('gitter:app:gitlab:group-service');
const { Groups, GroupMembers } = require('gitlab');
const { secureWrapFunction } = require('gitter-web-cache-wrapper');
const getGitlabAccessTokenFromUser = require('./get-gitlab-access-token-from-user');
const getPublicTokenFromPool = require('./get-public-token-from-pool');

function cacheFunction(name, obj) {
  return secureWrapFunction(`GitLabGroupService:${name}`, obj, async gitLabGroupService => {
    const accessToken = await gitLabGroupService.getAccessTokenPromise;
    return accessToken;
  });
}

/*
{
  id: 3281315,
  web_url: 'https://gitlab.com/groups/gitter-integration-tests-group',
  name: 'gitter-integration-tests-group',
  path: 'gitter-integration-tests-group',
  description: '',
  visibility: 'public',
  lfs_enabled: true,
  avatar_url: null,
  request_access_enabled: false,
  full_name: 'gitter-integration-tests-group',
  full_path: 'gitter-integration-tests-group',
  parent_id: null,
  ldap_cn: null,
  ldap_access: null
}
*/
function standardizeGroupResponse(group) {
  debug('standardizeGroupResponse', group);
  return {
    backend: 'gitlab',
    id: group.id,
    name: group.full_name,
    avatar_url: group.avatar_url,
    uri: group.full_path,
    absoluteUri: group.web_url
  };
}

function standardizeResponse(response) {
  return (response || []).map(standardizeGroupResponse);
}

function GitLabGroupService(user) {
  this.user = user;
  this.getAccessTokenPromise = getGitlabAccessTokenFromUser(user);
}

GitLabGroupService.prototype._getGitlabOpts = async function() {
  const accessToken = await this.getAccessTokenPromise;
  return {
    oauthToken: accessToken,
    token: getPublicTokenFromPool()
  };
};

GitLabGroupService.prototype._getGroupResource = async function() {
  if (this._groupsResource) {
    return this._groupsResource;
  }

  const gitlabLibOpts = await this._getGitlabOpts();
  this._groupsResource = new Groups(gitlabLibOpts);

  return this._groupsResource;
};

GitLabGroupService.prototype.getGroups = cacheFunction('getGroups', async function(params) {
  const resource = await this._getGroupResource();
  const res = await resource.all(params);

  return standardizeResponse(res);
});

GitLabGroupService.prototype.getGroup = cacheFunction('getGroup', async function(id) {
  const resource = await this._getGroupResource();
  const group = await resource.show(id);

  return standardizeGroupResponse(group);
});

GitLabGroupService.prototype._getGroupMember = cacheFunction('_getGroupMember', async function(
  groupId,
  gitlabUserId
) {
  const gitlabLibOpts = await this._getGitlabOpts();
  const groupMembers = new GroupMembers(gitlabLibOpts);

  try {
    const groupMember = await groupMembers.show(groupId, gitlabUserId, {
      includeInherited: true
    });
    debug('isMember groupMember response =>', groupMember);
    return groupMember;
  } catch (err) {
    debug('isMember error =>', err);
    if (err && err.response && err.response.status === 404) {
      return false;
    }

    throw err;
  }
});

GitLabGroupService.prototype.getMembership = async function(groupId, gitlabUserId) {
  const groupMember = await this._getGroupMember(groupId, gitlabUserId);
  let accessLevel = 0;
  if (groupMember) {
    accessLevel = groupMember.access_level;
  }

  // https://docs.gitlab.com/ee/api/access_requests.html
  return {
    accessLevel,
    isMember: [10, 20, 30, 40, 50].some(level => level === accessLevel),
    isMaintainer: [40, 50].some(level => level === accessLevel),
    isOwner: accessLevel === 50
  };
};

module.exports = GitLabGroupService;
