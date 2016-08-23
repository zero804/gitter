'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var isGitHubUser = require('gitter-web-identity/lib/is-github-user');

function GhUserPolicyDelegate(userId, userLoader, securityDescriptor) {
  assert(userLoader, 'userLoader required');
  assert(securityDescriptor, 'securityDescriptor required');

  this._userId = userId;
  this._userLoader = userLoader;
  this._securityDescriptor = securityDescriptor;
}

GhUserPolicyDelegate.prototype = {
  hasPolicy: Promise.method(function(policyName) {

    switch(policyName) {
      case 'GH_USER_SAME':
        return this._usernameMatchesUri();

      default:
        return false;
    }
  }),

  /**
   * Returns a key used to skip checks
   */
  getPolicyRateLimitKey: function() {
    return null;
  },

  /* Does the username match */
  _usernameMatchesUri: function() {
    if (!this._userId) return false;

    var linkPath = this._securityDescriptor.linkPath;
    if (!linkPath) return false;

    return this._userLoader()
      .then(function(user) {
        if (!user) return false;
        if (!isGitHubUser(user)) return false;

        var currentUserName = user.username;
        if (!currentUserName) return false;

        return currentUserName.toLowerCase() === linkPath.toLowerCase();
      });
  }

};

module.exports = GhUserPolicyDelegate;
