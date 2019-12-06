'use strict';

const assert = require('assert');
const Promise = require('bluebird');
const { GitLabGroupService } = require('gitter-web-gitlab');
const PolicyDelegateTransportError = require('./policy-delegate-transport-error');
const identityService = require('gitter-web-identity');

function GlGroupPolicyDelegate(userId, userLoader, securityDescriptor) {
  assert(userLoader, 'userLoader required');
  assert(securityDescriptor, 'securityDescriptor required');

  this._userId = userId;
  this._userLoader = userLoader;
  this._securityDescriptor = securityDescriptor;
  this.cachedIsMember;
}

GlGroupPolicyDelegate.prototype = {
  hasPolicy: async function(policyName) {
    if (policyName !== 'GL_GROUP_MEMBER') {
      return false;
    }

    if (!this._isValidUser()) {
      return false;
    }

    if (this.cachedIsMember === undefined) {
      this.cachedIsMember = await this.checkMembership();
    }

    return this.cachedIsMember;
  },

  getAccessDetails: function() {
    if (!this._isValidUser()) return;

    const sd = this._securityDescriptor;
    return {
      type: 'GL_GROUP',
      linkPath: sd.linkPath,
      externalId: sd.externalId
    };
  },

  getPolicyRateLimitKey: function(policyName) {
    if (!this._isValidUser()) return;
    const uri = this._securityDescriptor.linkPath;

    return 'GL_GROUP:' + this._userId + ':' + uri + ':' + policyName;
  },

  _isValidUser: function() {
    return !!this._userId;
  },

  checkMembership: async function() {
    const uri = this._securityDescriptor.linkPath;

    const user = await this._userLoader();
    const gitLabIdentity = await identityService.getIdentityForUser(user, 'gitlab');

    if (!gitLabIdentity) {
      return false;
    }

    try {
      const glGroupService = new GitLabGroupService(user);
      const isMember = await glGroupService.isMember(uri, gitLabIdentity.providerKey);
      return isMember;
    } catch (err) {
      throw new PolicyDelegateTransportError(err.message);
    }
  }
};

module.exports = GlGroupPolicyDelegate;
