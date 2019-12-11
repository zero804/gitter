'use strict';

const assert = require('assert');
const { GitLabGroupService } = require('gitter-web-gitlab');
const PolicyDelegateTransportError = require('./policy-delegate-transport-error');
const identityService = require('gitter-web-identity');

class GlGroupPolicyDelegate {
  constructor(userId, userLoader, securityDescriptor) {
    assert(userLoader, 'userLoader required');
    assert(securityDescriptor, 'securityDescriptor required');

    this._userId = userId;
    this._userLoader = userLoader;
    this._securityDescriptor = securityDescriptor;
  }

  async hasPolicy(policyName) {
    if (policyName !== 'GL_GROUP_MEMBER') {
      return false;
    }

    if (!this._isValidUser()) {
      return false;
    }

    if (this._cachedIsMember === undefined) {
      this._cachedIsMember = await this._checkMembership();
    }

    return this._cachedIsMember;
  }

  getAccessDetails() {
    if (!this._isValidUser()) return;

    const sd = this._securityDescriptor;
    return {
      type: 'GL_GROUP',
      linkPath: sd.linkPath,
      externalId: sd.externalId
    };
  }

  getPolicyRateLimitKey(policyName) {
    if (!this._isValidUser()) return;
    const uri = this._securityDescriptor.linkPath;

    return 'GL_GROUP:' + this._userId + ':' + uri + ':' + policyName;
  }

  _isValidUser() {
    return !!this._userId;
  }

  async _checkMembership() {
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
}

module.exports = GlGroupPolicyDelegate;
