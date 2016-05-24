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
        var currentUserName = this._user.username;
        if (!currentUserName) return false;

        var linkPath = this._securityDescriptor.linkPath;
        if (!linkPath) return false;

        return currentUserName.toLowerCase() === linkPath.toLowerCase();

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
