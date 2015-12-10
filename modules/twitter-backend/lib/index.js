'use strict';

var Q = require('q');

function TwitterBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

TwitterBackend.prototype.getEmailAddress = function(preferStoredEmail) {
  return Q.resolve(this.identity.email);
};

TwitterBackend.prototype.findOrgs = function() {
  return Q.resolve([]);
};

TwitterBackend.prototype.getProfile = function() {
  return Q.resolve({provider: 'twitter'});
};

module.exports = TwitterBackend;
