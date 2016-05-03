"use strict";

var wrap = require('./github-cache-wrapper');
var tentacles = require('./tentacles-client');
var userTokenSelector = require('./user-token-selector').full;

function GitHubOrgService(user) {
  this.user = user;
  this.accessToken = userTokenSelector(user);
}

/**
 * Returns the details of an org
 */
GitHubOrgService.prototype.getOrg = function(org) {
  return tentacles.org.get(org, {
    accessToken: this.accessToken,
  });
};

/**
 * Returns the list of users with publisized membership to an organisation
 */
GitHubOrgService.prototype.members = function(org) {
  return tentacles.orgMember.listMembers(org, {
    accessToken: this.accessToken,
  });
};

GitHubOrgService.prototype.someMembers = function(org) {
  return tentacles.orgMember.listMembers(org, {
    accessToken: this.accessToken,
    firstPageOnly: true,
  });
};

GitHubOrgService.prototype.member = function(org, username) {
  return tentacles.orgMember.checkMembershipForUser(org, username, {
    accessToken: this.accessToken,
  });
};

GitHubOrgService.prototype.getRepos = function(org) {
  return tentacles.repo.listForOrg(org, {
    accessToken: this.accessToken,
  });
};

GitHubOrgService.prototype.getMembership = function(org, username) {
  return tentacles.orgMember.getMembershipForUser(org, username, {
    accessToken: this.accessToken,
  });
};

module.exports = wrap(GitHubOrgService, function() {
  return [this.accessToken || ''];
});
module.exports.raw = GitHubOrgService;
