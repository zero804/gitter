'use strict';

var Promise = require('bluebird');

function GoogleBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

GoogleBackend.prototype.getEmailAddress = Promise.method(function(options) {
  return this.identity.email;
});

GoogleBackend.prototype.findOrgs = Promise.method(function() {
  return [];
});

GoogleBackend.prototype.getProfile = Promise.method(function() {
  // TODO: gravatar or fullcontact?
  return { provider: 'google' };
});

module.exports = GoogleBackend;
