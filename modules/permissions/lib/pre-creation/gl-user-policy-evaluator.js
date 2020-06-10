'use strict';

const identityService = require('gitter-web-identity');

class GitlabUserPolicyEvaluator {
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
    if (!gitLabIdentity) return false;

    this._canAccessResult = this.uri.toLowerCase() === gitLabIdentity.username.toLowerCase();
    return this._canAccessResult;
  }
}

module.exports = GitlabUserPolicyEvaluator;
