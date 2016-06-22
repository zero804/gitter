'use strict';

var Promise = require('bluebird');
var persistence = require('gitter-web-persistence');
var LegacyGitHubPolicyEvaluator = require('./legacy-github-policy-evaluator');
var StaticPolicyEvaluator = require('./static-policy-evaluator');
var debug = require('debug')('gitter:app:permissions:legacy-group-policy-evaluator');
var StatusError = require('statuserror');
var assert = require('assert');

function LegacyGroupPolicyEvaluator(userId, user, type, uri, githubId, obtainAccessFromGitHubRepo) {
  debug('LegacyGroupPolicyEvaluator userId=%s type=%s uri=%s githubId=%s obtainAccessFromGitHubRepo=%s',
    userId, type, uri, githubId, obtainAccessFromGitHubRepo);

  this._userId = userId;

  assert(type, 'type expected');
  assert(uri, 'uri expected');

  this._type = type;
  this._githubId = githubId;
  this._uri = uri;
  this._obtainAccessFromGitHubRepo = obtainAccessFromGitHubRepo;

  if (this._userId) {
    this._userPromise = user && Promise.resolve(user);
  } else {
    // No userId, so user is always null
    this._userPromise = Promise.resolve(null);
  }

  this._policyPromise = null;
}

LegacyGroupPolicyEvaluator.prototype = {
  canRead: Promise.method(function() {
    return this._fetchLegacyPolicy()
      .then(function(policy) {
        return policy.canRead();
      });
  }),

  canWrite: Promise.method(function() {
    return this._fetchLegacyPolicy()
      .then(function(policy) {
        return policy.canWrite();
      });
  }),

  canJoin: Promise.method(function() {
    return this._fetchLegacyPolicy()
      .then(function(policy) {
        return policy.canJoin();
      });
  }),

  canAdmin: Promise.method(function() {
    return this._fetchLegacyPolicy()
      .then(function(policy) {
        return policy.canAdmin();
      });
  }),

  canAddUser: Promise.method(function() {
    return this._fetchLegacyPolicy()
      .then(function(policy) {
        return policy.canAddUser();
      });
  }),

  _fetchUser: function() {
    if (this._userPromise) return this._userPromise;

    this._userPromise = persistence.User.findById(this._userId, null, { lean: true })
      .exec();

    return this._userPromise;
  },

  _fetchLegacyPolicy: function() {
    if (this._policyPromise) return this._policyPromise;


    this._policyPromise = this._fetchUser()
      .bind(this)
      .then(function(user) {
        var obtainAccessFromGitHubRepo = this._obtainAccessFromGitHubRepo;

        // TODO: we should probably check that the repo matches the URI, but since this
        // code is about to go, we'll leave it for now
        switch (this._type) {
          case 'USER':
            if (this._callingUserMatchesGroup(user)) {
              debug('User and group match, granting user full access');
              return new StaticPolicyEvaluator(true);
            }

            if (obtainAccessFromGitHubRepo) {
              debug('Deferring permissions to GitHub repo: uri=%s', obtainAccessFromGitHubRepo);
              return new LegacyGitHubPolicyEvaluator(user, obtainAccessFromGitHubRepo, 'REPO', null);
            } else {
              throw new StatusError(500, 'User and group do not match, and obtainAccessFromGitHubRepo not provided, denying access');
            }
            /* break; */

          case 'ORG':
            if (obtainAccessFromGitHubRepo) {
              debug('Deferring permissions to GitHub repo: uri=%s', obtainAccessFromGitHubRepo);
              return new LegacyGitHubPolicyEvaluator(user, obtainAccessFromGitHubRepo, 'REPO', null);
            } else {
              debug('Delegating permissions to GitHub org: uri=%s', this._uri);
              return new LegacyGitHubPolicyEvaluator(user, this._uri, 'ORG', null);
            }

          default:
            debug('Unknown group type: type=%s, denying access', this._type);
            /* Deny all */
            return new StaticPolicyEvaluator(false);
        }
      });

    return this._policyPromise;
  },

  /**
   * @private
   */
  _callingUserMatchesGroup: function(user) {
    if (this._type !== 'USER') return false;

    if (!user) return false;

    return user.username === this._uri ||
           user.githubId && user.githubId === this._githubId ||
           user.username.toLowerCase() === this._uri.toLowerCase();
  }


};


module.exports = LegacyGroupPolicyEvaluator;
