'use strict';

const debug = require('debug')('gitter:app:permissions:pre-creation:gl-group-policy-evaluator');
const PolicyDelegateTransportError = require('../policies/policy-delegate-transport-error');
const GitLabGroupService = require('gitter-web-gitlab').GitLabGroupService;
const identityService = require('gitter-web-identity');

class GitlabGroupPolicyEvaluator {
  constructor(user, uri) {
    this.user = user;
    this.uri = uri;

    this._canAccessResult = null;
  }

  async canRead() {
    return this._canAccess();
  }

  async canWrite() {
    return this._canAccess();
  }

  async canJoin() {
    // You can never join a room which has not yet been created
    return false;
  }

  async canAdmin() {
    return this._canAccess();
  }

  async canAddUser() {
    // You can never add a user to a room which has not yet been created
    return false;
  }

  async _canAccess() {
    if (this._canAccessResult !== null) {
      return this._canAccessResult;
    }

    if (!this.user || !this.user.username) return false;

    const gitLabIdentity = await identityService.getIdentityForUser(this.user, 'gitlab');
    // Non GitLab users will never be an group member
    if (!gitLabIdentity) return false;

    const gitlabGroupService = new GitLabGroupService(this.user);
    try {
      const membership = await gitlabGroupService.getMembership(
        this.uri,
        gitLabIdentity.providerKey
      );
      this._canAccessResult = membership.isMaintainer;
      return this._canAccessResult;
    } catch (err) {
      debug('Exeception while fetching group');

      if ((err.errno && err.syscall) || err.statusCode >= 500) {
        // GitLab call failed and may be down.
        throw new PolicyDelegateTransportError(err.message);
      }

      throw err;
    }
  }
}

module.exports = GitlabGroupPolicyEvaluator;
