'use strict';

var backendResolver = require('./backend-resolver');

module.exports = function(user, preferStoredEmail) {
  return backendResolver.getFirstResult(user, 'getEmailAddress', [user, preferStoredEmail]);
};
