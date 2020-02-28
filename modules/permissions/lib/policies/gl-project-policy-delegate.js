'use strict';

const assert = require('assert');
const debug = require('debug')('gitter:app:permissions:gl-project-policy-delegate');
const { GitLabProjectService } = require('gitter-web-gitlab');
const PolicyDelegateTransportError = require('./policy-delegate-transport-error');
const identityService = require('gitter-web-identity');

class GlProjectPolicyDelegate {
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

    const membership = await this._checkMembership();
    if (!membership) {
      return false;
    }

    switch (policyName) {
      case 'GL_PROJECT_MEMBER':
        return membership.isMember;

      case 'GL_PROJECT_MAINTAINER':
        return membership.isMaintainer;

      default:
        debug(`Unknown permission ${policyName}, denying access`);
        return false;
    }
  }

  getAccessDetails() {
    if (!this._isValidUser()) return;

    const sd = this._securityDescriptor;
    return {
      type: 'GL_PROJECT',
      linkPath: sd.linkPath,
      externalId: sd.externalId
    };
  }

  getPolicyRateLimitKey(policyName) {
    if (!this._isValidUser()) return;
    const uri = this._securityDescriptor.linkPath;

    return 'GL_PROJECT:' + this._userId + ':' + uri + ':' + policyName;
  }

  _isValidUser() {
    return !!this._userId;
  }

  async _checkMembership() {
    const uri = this._securityDescriptor.linkPath;

    const user = await this._userLoader();
    const gitLabIdentity = await identityService.getIdentityForUser(
      user,
      identityService.GITLAB_IDENTITY_PROVIDER
    );

    if (!gitLabIdentity) {
      return null;
    }

    try {
      const glProjectService = new GitLabProjectService(user);
      return await glProjectService.getMembership(uri, gitLabIdentity.providerKey);
    } catch (err) {
      throw new PolicyDelegateTransportError(err.message);
    }
  }
}

module.exports = GlProjectPolicyDelegate;
