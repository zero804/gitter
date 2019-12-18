'use strict';

const debug = require('debug')('gitter:app:gitlab:group-service');
const { Groups } = require('gitlab');
const cacheWrapper = require('gitter-web-cache-wrapper');
const getGitlabAccessTokenFromUser = require('./get-gitlab-access-token-from-user');
const getPublicTokenFromPool = require('./get-public-token-from-pool');

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

GitLabGroupService.prototype.getGroupResource = async function() {
  const accessToken = await this.getAccessTokenPromise;
  const gitlabLibOpts = {
    oauthToken: accessToken,
    token: getPublicTokenFromPool()
  };
  return new Groups(gitlabLibOpts);
};

GitLabGroupService.prototype.getGroups = async function() {
  const resource = await this.getGroupResource();
  const res = await resource.all();

  return standardizeResponse(res);
};

GitLabGroupService.prototype.getGroup = async function(id) {
  const resource = await this.getGroupResource();
  const group = await resource.show(id);

  return standardizeGroupResponse(group);
};

module.exports = cacheWrapper('GitLabGroupService', GitLabGroupService, {
  getInstanceId: function(gitLabGroupService) {
    return gitLabGroupService.getAccessTokenPromise;
  }
});
