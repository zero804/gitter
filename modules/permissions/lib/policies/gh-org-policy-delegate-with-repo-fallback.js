'use strict';

var Promise = require('bluebird');
var GhOrgPolicyDelegate = require('./gh-org-policy-delegate');
var LegacyGitHubPolicyEvaluator = require('./legacy-github-policy-evaluator');
var debug = require('debug')('gitter:app:permissions:gh-policy-delegate-w-repo-fallback');

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

        debug('Access denied by ORG delegate, attempting to use repo access');

        // Fallback to the repo
        return this._repoPolicy.canAdmin();
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

    var result = securityDescriptor.type === 'GH_ORG' && repoOrgOrUser === securityDescriptor.linkPath;
    debug('Is repo=%s a valid repo for %s', fallbackRepo, securityDescriptor.linkPath, result);
    return result;
  }
};

module.exports = GhOrgPolicyDelegateWithRepoFallback;
