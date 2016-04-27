'use strict';

var Promise = require('bluebird');
var GitHubOrgService = require('gitter-web-github').GitHubOrgService;
var StatusError = require('statuserror');

function GhOrgPolicyDelegate(user, permissionPolicy) {
  this._user = user;
  this._permissionPolicy = permissionPolicy;
  this._fetchPromise = null;
}

GhOrgPolicyDelegate.prototype = {
  hasPolicy: Promise.method(function(policyName) {
    if (!this._isValidUser()) {
      return false;
    }

    if (policyName !== 'GH_ORG_MEMBER') {
      throw new StatusError(403, 'Invalid permissions');
    }

    return this._fetch();
  }),

  getPolicyRateLimitKey: function(policyName) {
    if (!this._isValidUser()) return;
    var uri = this._permissionPolicy.linkPath;

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
    var uri = this._permissionPolicy.linkPath;

    var ghOrg = new GitHubOrgService(user);
    this._fetchPromise = ghOrg.member(uri, user.username);
    return this._fetchPromise;
  }
};

module.exports = GhOrgPolicyDelegate;
