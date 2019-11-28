'use strict';

const { GitLabGroupService } = require('gitter-web-gitlab');

function GitLabBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

GitLabBackend.prototype.getEmailAddress = function(/*preferStoredEmail*/) {
  return this.identity.email;
};

GitLabBackend.prototype.findOrgs = function() {
  const gitlabGroupService = new GitLabGroupService(this.user);
  return gitlabGroupService.getGroups();
};

GitLabBackend.prototype.getProfile = function() {
  return { provider: 'gitlab' };
};

module.exports = GitLabBackend;
