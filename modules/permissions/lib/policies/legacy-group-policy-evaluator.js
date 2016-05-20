'use strict';

var Promise = require('bluebird');
var persistence = require('gitter-web-persistence');
var LegacyGitHubPolicyEvaluator = require('./legacy-github-policy-evaluator');
var StaticPolicyEvaluator = require('./static-policy-evaluator');
var debug = require('debug')('gitter:permissions:legacy-group-policy-evaluator');
var StatusError = require('statuserror');

function LegacyGroupPolicyEvaluator(userId, user, groupId, group, obtainAccessFromGitHubRepo) {
  this._userId = userId;
  if (this._userId) {
    this._userPromise = user && Promise.resolve(user);
  } else {
    // No userId, so user is always null
    this._userPromise = Promise.resolve(null);
  }

  this._obtainAccessFromGitHubRepo = obtainAccessFromGitHubRepo;
  this._groupId = groupId;
  this._groupPromise = group && Promise.resolve(group);
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

  _fetchGroup: function() {
    if (this._groupPromise) return this._groupPromise;

    this._groupPromise = persistence.Group.findById(this._groupId, null, { lean: true })
      .exec();

    return this._groupPromise;
  },

  _fetchLegacyPolicy: function() {
    if (this._policyPromise) return this._policyPromise;

    var obtainAccessFromGitHubRepo = this._obtainAccessFromGitHubRepo;

    this._policyPromise = Promise.join(
      this._fetchGroup(),
      this._fetchUser(),
      function(group, user) {
        if (!group) {
          throw new StatusError(404);
        }

        switch (group.type) {
          case 'USER':
            if (callingUserMatchesGroup(user, group)) {
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
            debug('Delegating permissions to GitHub org: uri=%s', group.uri);
            return new LegacyGitHubPolicyEvaluator(user, group.uri, 'ORG', null);

          default:
            debug('Unknown group type: type=%s, denying access', group.uri);
            /* Deny all */
            return new StaticPolicyEvaluator(false);
        }
      });

    return this._policyPromise;
  }
};

/**
 * @private
 */
function callingUserMatchesGroup(user, group) {
  if (group.type !== 'USER') return false;
  return user.username === group.uri ||
         user.githubId && user.githubId === group.githubId ||
         user.username.toLowerCase() === group.lcUri;
}

module.exports = LegacyGroupPolicyEvaluator;
