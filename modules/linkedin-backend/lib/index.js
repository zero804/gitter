'use strict';

var Q = require('q');

function LinkedInBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

LinkedInBackend.prototype.getEmailAddress = function(preferStoredEmail) {
  return Q.resolve(this.identity.email);
};

LinkedInBackend.prototype.findOrgs = function() {
  return Q.resolve([]);
};

LinkedInBackend.prototype.getProfile = function() {
  // TODO: gravatar or fullcontact?
  return Q.resolve({provider: 'linkedin'});
};

module.exports = LinkedInBackend;
