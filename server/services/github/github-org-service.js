"use strict";

var wrap = require('./github-cache-wrapper');
var tentacles = require('./tentacles-client');
var userTokenSelector = require('./user-token-selector').full;
var githubMediaTypes = require('./github-media-types');

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
    headers: { Accept: githubMediaTypes.MOONDRAGON }
  });
};

/**
 * Returns the list of users with publisized membership to an organisation
 */
GitHubOrgService.prototype.members = function(org) {
  return tentacles.orgMember.listMembers(org, {
    accessToken: this.accessToken,
    headers: { Accept: githubMediaTypes.MOONDRAGON }
  });
};

GitHubOrgService.prototype.member = function(org, username) {
  return tentacles.orgMember.checkMembershipForUser(org, username, {
    accessToken: this.accessToken,
    headers: { Accept: githubMediaTypes.MOONDRAGON }
  });
};

GitHubOrgService.prototype.getRepos = function(org) {
  return tentacles.repo.listForOrg(org, {
    accessToken: this.accessToken,
    headers: { Accept: githubMediaTypes.MOONDRAGON }
  });
};

GitHubOrgService.prototype.getMembership = function(org, username) {
  return tentacles.orgMember.getMembershipForUser(org, username, {
    accessToken: this.accessToken,
    headers: { Accept: githubMediaTypes.MOONDRAGON }
  });
};

module.exports = wrap(GitHubOrgService, function() {
  return [this.accessToken || ''];
});
