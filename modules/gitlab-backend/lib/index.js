'use strict';

const { GitLabGroupService } = require('gitter-web-gitlab');

// https://docs.gitlab.com/ee/api/access_requests.html
const MAINTAINER_ACCESS_LEVEL = 40;

function GitLabBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

GitLabBackend.prototype.getEmailAddress = function(/*preferStoredEmail*/) {
  return this.identity.email;
};

GitLabBackend.prototype.findOrgs = function() {
  const gitlabGroupService = new GitLabGroupService(this.user);
  return gitlabGroupService.getGroups({ min_access_level: MAINTAINER_ACCESS_LEVEL });
};

GitLabBackend.prototype.getProfile = function() {
  return { provider: 'gitlab' };
};

module.exports = GitLabBackend;
