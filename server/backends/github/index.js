'use strict';

var GitHubEmailAddressService = require('./github-email-address-service');

function GitHubBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

GitHubBackend.prototype.getEmailAddress = function(preferStoredEmail) {
  return GitHubEmailAddressService(this.user, preferStoredEmail);
};

module.exports = GitHubBackend;
