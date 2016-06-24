'use strict';

var Promise = require('bluebird');
var GitHubOrgService = require('gitter-web-github').GitHubOrgService;
var PolicyDelegateTransportError = require('./policy-delegate-transport-error');

function GhOrgPolicyDelegate(userId, userLoader, securityDescriptor) {
  this._userId = userId;
  this._userLoader = userLoader;
  this._securityDescriptor = securityDescriptor;
  this._fetchPromise = null;
}

GhOrgPolicyDelegate.prototype = {
  hasPolicy: Promise.method(function(policyName) {
    if (policyName !== 'GH_ORG_MEMBER') {
      return false;
    }

    if (!this._isValidUser()) {
      return false;
    }

    return this._fetch();
  }),

  getPolicyRateLimitKey: function(policyName) {
    if (!this._isValidUser()) return;
    var uri = this._securityDescriptor.linkPath;

    return "GH_ORG:" + this._userId + ":" + uri + ":" + policyName;
  },

  _isValidUser: function() {
    return !!this._userId;
  },

  _fetch: function() {
    if (this._fetchPromise) {
      return this._fetchPromise;
    }

    var uri = this._securityDescriptor.linkPath;

    this._fetchPromise = this._userLoader()
      .then(function(user) {
        var ghOrg = new GitHubOrgService(user);
        return ghOrg.member(uri, user.username);
      })
      .catch(function(err) {
        if(err.errno && err.syscall || err.statusCode >= 500) {
          // GitHub call failed and may be down.
          // We can fall back to whether the user is already in the room
          throw new PolicyDelegateTransportError(err.message);
        }

        throw err;
      });

    return this._fetchPromise;
  }
};

module.exports = GhOrgPolicyDelegate;
