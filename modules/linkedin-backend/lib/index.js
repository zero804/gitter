'use strict';

var Promise = require('bluebird');

function LinkedInBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

LinkedInBackend.prototype.getEmailAddress = Promise.method(function(preferStoredEmail) {
  return this.identity.email;
});

LinkedInBackend.prototype.findOrgs = Promise.method(function() {
  return [];
});

LinkedInBackend.prototype.getProfile = Promise.method(function() {
  // TODO: gravatar or fullcontact?
  return { provider: 'linkedin' };
});

module.exports = LinkedInBackend;
