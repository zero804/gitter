'use strict';

var BackendResolver = require('./backend-resolver');

module.exports = function(user, preferStoredEmail) {
  var backendResolver = new BackendResolver(user);
  return backendResolver.getEmailAddress(preferStoredEmail);
};
