'use strict';

var GitHubEmailAddressService = require('./github-email-address-service');

module.exports = {
  getEmailAddress: function getEmailAddress(user, preferStoredEmail) {
    return GitHubEmailAddressService(user, preferStoredEmail);
  }
};
