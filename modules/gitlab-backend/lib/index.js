'use strict';

var Promise = require('bluebird');
const { GitLabGroupService } = require('gitter-web-gitlab');

function GitLabBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

GitLabBackend.prototype.getEmailAddress = Promise.method(function(/*preferStoredEmail*/) {
  return this.identity.email;
});

GitLabBackend.prototype.findOrgs = Promise.method(function() {
  const gitlabGroupService = new GitLabGroupService(this.user);
  return gitlabGroupService.getGroups();
});

GitLabBackend.prototype.getProfile = Promise.method(function() {
  return { provider: 'gitlab' };
});

module.exports = GitLabBackend;
