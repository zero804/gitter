'use strict';

const assert = require('assert');
const debug = require('debug')('gitter:app:permissions:gl-user-policy-delegate');
const identityService = require('gitter-web-identity');

class GlUserPolicyDelegate {
  constructor(userId, userLoader, securityDescriptor) {
    assert(userLoader, 'userLoader required');
    assert(securityDescriptor, 'securityDescriptor required');

    this._userId = userId;
    this._userLoader = userLoader;
    this._securityDescriptor = securityDescriptor;
  }

  async hasPolicy(policyName) {
    if (!this._isValidUser()) {
      return false;
    }

    switch (policyName) {
      case 'GL_USER_SAME':
        return await this._checkIfUserSame();

      default:
        debug(`Unknown permission ${policyName}, denying access`);
        return false;
    }
  }

  getAccessDetails() {
    if (!this._isValidUser()) return;

    const sd = this._securityDescriptor;
    return {
      type: 'GL_USER',
      linkPath: sd.linkPath,
      externalId: sd.externalId
    };
  }

  getPolicyRateLimitKey(policyName) {
    if (!this._isValidUser()) return;
    const uri = this._securityDescriptor.linkPath;

    return 'GL_USER:' + this._userId + ':' + uri + ':' + policyName;
  }

  _isValidUser() {
    return !!this._userId;
  }

  async _checkIfUserSame() {
    const uri = this._securityDescriptor.linkPath;

    const user = await this._userLoader();
    const gitLabIdentity = await identityService.getIdentityForUser(
      user,
      identityService.GITLAB_IDENTITY_PROVIDER
    );
    if (!gitLabIdentity) return false;

    return uri.toLowerCase() === gitLabIdentity.username.toLowerCase();
  }
}

module.exports = GlUserPolicyDelegate;
