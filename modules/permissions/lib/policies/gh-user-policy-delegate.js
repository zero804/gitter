'use strict';

var Promise = require('bluebird');

function GhRepoPolicyDelegate(user, securityDescriptor) {
  this._user = user;
  this._securityDescriptor = securityDescriptor;
  this._fetchPromise = null;
}

GhRepoPolicyDelegate.prototype = {
  hasPolicy: Promise.method(function(policyName) {

    switch(policyName) {
      case 'GH_USER_SAME':
        return this._user.username === this._securityDescriptor.linkPath;

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
