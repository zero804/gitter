'use strict';

var Promise = require('bluebird');
var _ = require('lodash');

var GithubMe = require('gitter-web-github').GitHubMeService;
var gitHubEmailAddressService = require('./github-email-address-service');
var gitHubProfileService = require('./github-profile-service');
var gitHubInviteUserSuggestionsService = require('./github-invite-user-suggestions.js');


function GitHubBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

GitHubBackend.prototype.getEmailAddress = function(preferStoredEmail) {
  return gitHubEmailAddressService(this.user, preferStoredEmail);
};

GitHubBackend.prototype.findOrgs = Promise.method(function() {
  var user = this.user;
  var ghUser = new GithubMe(user);

  if (!ghUser.accessToken) return [];

  return ghUser.getOrgs()
    .then(function(ghOrgs) {
      // TODO: change these to be in a standard internal format
      return ghOrgs;
    });
});

GitHubBackend.prototype.getProfile = function() {
  // the minimum response
  var profile = {provider: 'github'};
  return gitHubProfileService(this.user)
    .then(function(gitHubProfile) {
      _.extend(profile, gitHubProfile);
      return profile;
    });
};

GitHubBackend.prototype.getInviteUserSuggestions = function(type, linkPath) {
  return gitHubInviteUserSuggestionsService(type, linkPath, this.user);
};

module.exports = GitHubBackend;
