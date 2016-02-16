'use strict';

var Promise = require('bluebird');

function TwitterBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

TwitterBackend.prototype.getEmailAddress = Promise.method(function(preferStoredEmail) {
  return this.identity.email;
});

TwitterBackend.prototype.findOrgs = Promise.method(function() {
  return [];
});

TwitterBackend.prototype.getProfile = Promise.method(function() {
  return { provider: 'twitter' };
});

module.exports = TwitterBackend;
