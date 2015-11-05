'use strict';

var gitHubEmailAddressService = require('./github-email-address-service');

function GitHubBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

GitHubBackend.prototype.getEmailAddress = function(preferStoredEmail) {
  return gitHubEmailAddressService(this.user, preferStoredEmail);
};

module.exports = GitHubBackend;
