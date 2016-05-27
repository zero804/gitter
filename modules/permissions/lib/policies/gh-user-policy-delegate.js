'use strict';

var Promise = require('bluebird');

function GhRepoPolicyDelegate(user, securityDescriptor) {
  this._user = user;
  this._securityDescriptor = securityDescriptor;
  this._fetchPromise = null;
}

function usernameMatchesUri(user, linkPath) {
  if (!user) return false;
  var currentUserName = user.username;
  if (!currentUserName) return false;

  if (!linkPath) return false;

  return currentUserName.toLowerCase() === linkPath.toLowerCase();
}

GhRepoPolicyDelegate.prototype = {
  hasPolicy: Promise.method(function(policyName) {

    switch(policyName) {
      case 'GH_USER_SAME':
        return usernameMatchesUri(this._user, this._securityDescriptor.linkPath);

      default:
        return false;
    }
  }),

  /**
   * Returns a key used to skip checks
   */
  getPolicyRateLimitKey: function() {
    return null;
  }
};

module.exports = GhRepoPolicyDelegate;
