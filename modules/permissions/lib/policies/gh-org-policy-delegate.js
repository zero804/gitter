'use strict';

var Promise = require('bluebird');
var GitHubOrgService = require('gitter-web-github').GitHubOrgService;
var PolicyDelegateTransportError = require('./policy-delegate-transport-error');

function GhOrgPolicyDelegate(user, securityDescriptor) {
  this._user = user;
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

    return "GH_ORG:" + this._user._id + ":" + uri + ":" + policyName;
  },

  _isValidUser: function() {
    var user = this._user;
    if (!user) return false;
    if (!user.username) return false;
    // TODO: check that this user is a github user...
    return true;
  },

  _fetch: function() {
    if (this._fetchPromise) {
      return this._fetchPromise;
    }

    var user = this._user;
    var uri = this._securityDescriptor.linkPath;

    var ghOrg = new GitHubOrgService(user);
    this._fetchPromise = ghOrg.member(uri, user.username)
      .catch(function(err) {
        if(err.errno && err.syscall || err.statusCode >= 500) {
          // GitHub call failed and may be down.
          // We can fall back to whether the user is already in the room
          throw new PolicyDelegateTransportError(err.message);
        }

        throw err;
      })
    return this._fetchPromise;
  }
};

module.exports = GhOrgPolicyDelegate;
