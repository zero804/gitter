'use strict';

var Q = require('q');

function GoogleBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

GoogleBackend.prototype.getEmailAddress = function(preferStoredEmail) {
  return Q.resolve(this.identity.email);
};

GoogleBackend.prototype.getSerializedOrgs = function() {
  return Q.resolve([]);
};

GoogleBackend.prototype.getProfile = function() {
  // TODO: gravatar or fullcontact?
  return Q.resolve({provider: 'google'});
};

module.exports = GoogleBackend;
