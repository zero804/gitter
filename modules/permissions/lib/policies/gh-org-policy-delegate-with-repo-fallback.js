'use strict';

var Promise = require('bluebird');
var GhOrgPolicyDelegate = require('./gh-org-policy-delegate');
var LegacyGitHubPolicyEvaluator = require('./legacy-github-policy-evaluator');
var debug = require('debug')('gitter:app:permissions:gh-policy-delegate-w-repo-fallback');

function GhOrgPolicyDelegateWithRepoFallback(userId, userLoader, securityDescriptor, fallbackRepo) {
  this._orgPolicy = new GhOrgPolicyDelegate(userId, userLoader, securityDescriptor);
  this._userLoader = userLoader;
  this._fallbackRepo = fallbackRepo;
  this._isValidFallback = this._isValidFallback(securityDescriptor, fallbackRepo);
  this._getFallbackPolicyPromise = null;
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

        // Fallback to the repo and check that the user has
        // admin rights on it
        debug('Access denied by ORG delegate, attempting to use repo access');
        return this.__getFallbackPolicy()
          .then(function(policy) {
            if (!policy) return false;
            return policy.canAdmin();
          });
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
  },

  _getFallbackPolicy: Promise.method(function() {
    if (!this._userId) return null;
    if (!this._isValidFallback) return null;
    if (this._getFallbackPolicyPromise) return this._getFallbackPolicyPromise;

    var fallbackRepo = this._fallbackRepo;

    var promise = this._getFallbackPolicyPromise = this._userLoader()
      .then(function(user) {
        if (!user) return null;

        return new LegacyGitHubPolicyEvaluator(user, fallbackRepo, 'REPO', null);
      });

    return promise;
  })
};

module.exports = GhOrgPolicyDelegateWithRepoFallback;
