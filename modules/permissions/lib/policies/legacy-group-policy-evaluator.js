'use strict';

var Promise = require('bluebird');
var persistence = require('gitter-web-persistence');
var LegacyGitHubPolicyEvaluator = require('./legacy-github-policy-evaluator');

function LegacyGroupPolicyEvaluator(userId, user, groupId, group) {
  this._userId = userId;
  if (this._userId) {
    this._userPromise = user && Promise.resolve(user);
  } else {
    // No userId, so user is always null
    this._userPromise = Promise.resolve(null);
  }

  this._groupId = groupId;
  this._groupPromise = group && Promise.resolve(group);
  this._policyPromise = null;
}

LegacyGroupPolicyEvaluator.prototype = {
  canRead: Promise.method(function() {
    return true;
  }),

  canWrite: Promise.method(function() {
    return this._fetchLegacyPolicy()
      .then(function(policy) {
        if (!policy) return false;

        return policy.canWrite();
      });
  }),

  canJoin: Promise.method(function() {
    return true;
  }),

  canAdmin: Promise.method(function() {
    return this._fetchLegacyPolicy()
      .then(function(policy) {
        if (!policy) return false;

        return policy.canAdmin();
      });
  }),

  canAddUser: Promise.method(function() {
    return this._fetchLegacyPolicy()
      .then(function(policy) {
        if (!policy) return false;

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

    this._policyPromise = Promise.join(
      this._fetchGroup(),
      this._fetchUser(),
      function(group, user) {
        if (!group) return null;

        switch (group.type) {
          case 'USER':
            // What to do?
            return false;
          case 'ORG':
            return new LegacyGitHubPolicyEvaluator(user, group.uri, 'ORG', null);

          default:
            return false;
        }
      });

    return this._policyPromise;
  },


};

module.exports = LegacyGroupPolicyEvaluator;
