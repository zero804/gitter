'use strict';

var url = require('url');
var StatusError = require('statuserror');
var Q = require('q');

var identityService = require('../../services/identity-service');

var USER_INFO_URL = 'https://www.googleapis.com/oauth2/v1/userinfo';

module.exports = function googleEmailService(user, preferStoredEmail) {
  return identityService.getForUserAndProvider(user, 'google')
    .then(function(identity) {
      if (!identity) throw new StatusError(404);

      // Use the email address stored on the identity because the accessToken
      // will have almost certainly expired already and we don't have
      // refreshTokens for Google.
      console.log("identity", identity);
      return identity.email;
    });
};
