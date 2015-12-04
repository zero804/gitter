'use strict';

var gitHubEmailAddressService = require('./github-email-address-service');
var gitHubProfileService = require('./github-profile-service');
var GithubMe = require('gitter-web-github').GitHubMeService;
var Mirror = require('gitter-web-github').GitHubMirrorService('user');
var Q = require('q');
var _ = require('lodash');

function GitHubBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

GitHubBackend.prototype.getEmailAddress = function(preferStoredEmail) {
  return gitHubEmailAddressService(this.user, preferStoredEmail);
};

GitHubBackend.prototype.findOrgs = function() {
  var user = this.user;
  var ghUser = new GithubMe(user);
  return ghUser.getOrgs()
    .then(function(ghOrgs) {
      // TODO: change these to be in a standard internal format
      return ghOrgs;
    });
};

GitHubBackend.prototype.getProfile = function() {
  // the minimum response
  var profile = {provider: 'github'};
  return gitHubProfileService(this.user, false)
    .then(function(gitHubProfile) {
      _.extend(profile, gitHubProfile);
      return profile;
    });
};

module.exports = GitHubBackend;
