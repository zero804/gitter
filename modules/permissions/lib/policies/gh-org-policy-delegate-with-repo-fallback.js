'use strict';

var Promise = require('bluebird');
var GhOrgPolicyDelegate = require('./gh-org-policy-delegate');
var LegacyGitHubPolicyEvaluator = require('./legacy-github-policy-evaluator');

function GhOrgPolicyDelegateWithRepoFallback(user, securityDescriptor, fallbackRepo) {
  this._orgPolicy = new GhOrgPolicyDelegate(user, securityDescriptor);
  this._fallbackRepo = fallbackRepo;
  this._isValidFallback = this._isValidFallback(securityDescriptor, fallbackRepo);
  if (this._isValidFallback) {
    this._repoPolicy = new LegacyGitHubPolicyEvaluator(user, fallbackRepo, 'REPO', null);
  } else {
    this._repoPolicy = null;
  }
}

GhOrgPolicyDelegateWithRepoFallback.prototype = {
  hasPolicy: Promise.method(function(policyName) {
    if (!this._isValidFallback || policyName !== 'GH_ORG_MEMBER') {
      return this._orgPolicy.hasPolicy(policyName);
    }

    return this._orgPolicy.hasPolicy(policyName)
      .bind(this)
      .then(function(hasAccess) {
        if (hasAccess) return true;

        // Fallback to the repo
        this._repoPolicy.canAdmin();
      });
  }),

  getPolicyRateLimitKey: function(policyName) {
    var underlyingKey = this._orgPolicy.getPolicyRateLimitKey(policyName);
    if (!underlyingKey) return;

    if (this._isValidFallback) {
      return "GH_ORG_WITH_REPO_FALLBACK:" + underlyingKey + ':' + this._fallbackRepo;
    } else {
      return underlyingKey;
    }
  },

  _isValidFallback: function(securityDescriptor, fallbackRepo) {
    if (!fallbackRepo) return false;
    var parts = fallbackRepo.split('/');
    if (parts.length !== 2) return false;

    var repoOrgOrUser = parts[0];

    return securityDescriptor.type === 'GH_ORG' && repoOrgOrUser === securityDescriptor.linkPath;
  }
};

module.exports = GhOrgPolicyDelegateWithRepoFallback;
