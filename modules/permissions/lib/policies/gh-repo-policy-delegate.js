'use strict';

var Promise = require('bluebird');
var GitHubRepoService = require('gitter-web-github').GitHubRepoService;

function GhRepoPolicyDelegate(user, permissionPolicy) {
  this._user = user;
  this._permissionPolicy = permissionPolicy;
  this._fetchPromise = null;
}

GhRepoPolicyDelegate.prototype = {
  hasPolicy: Promise.method(function(policyName) {
    if (!this._isValidUser()) {
      return false;
    }

    if (policyName !== 'GH_REPO_PUSH') {
      // This should never happen...
      return false;
    }

    return this._fetch();
  }),

  _isValidUser: function() {
    var user = this._user;
    if (!user) return false;
    if (!user.username) return false;
    // TODO: check that this user is a github user...
    return true;
  },

  _fetch: function() {
    if (this._fetchPromise) {
      return this._fetchPromise;
    }

    var user = this._user;
    var uri = this._permissionPolicy.linkPath;

    var repoService = new GitHubRepoService(user);
    this._fetchPromise = repoService.getRepo(uri)
      .then(function(repoInfo) {
        /* Can't see the repo? no access */
        if(!repoInfo) return false;

        var perms = repoInfo.permissions;
        return perms && (perms.push || perms.admin);
      });

    return this._fetchPromise;
  }
};

module.exports = GhRepoPolicyDelegate;
