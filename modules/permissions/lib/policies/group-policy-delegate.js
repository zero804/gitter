'use strict';

var Promise = require('bluebird');

function GroupPolicyDelegate(userId, userLoader, securityDescriptor) {
  this._userId = userId;
  this._userLoader = userLoader;
  this._securityDescriptor = securityDescriptor;
}

GroupPolicyDelegate.prototype = {
  hasPolicy: Promise.method(function(policyName) {

    switch(policyName) {
      case 'GROUP_ADMIN':
        return this._isAdmin();

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

  /* Is this user an admin of the group? */
  _isAdmin: function() {
    if (!this._userId) return false;

    var externalId = this._securityDescriptor.externalId;
    if (!externalId) return false;

    if (this._isAdminPromise) return this._isAdminPromise;

    var policyFactory = require('../policy-factory');
    var promise = this._isAdminPromise = policyFactory.createPolicyForGroupIdWithUserLoader(this._userId, this._userLoader, externalId)
      .then(function(policy) {
        return policy.canAdmin();
      });

    return promise;
  }

};

module.exports = GroupPolicyDelegate;
