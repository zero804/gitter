'use strict';

var Promise = require('bluebird');
var GitHubRepoService = require('gitter-web-github').GitHubRepoService;
var StatusError = require('statuserror');

function GhRepoPolicyDelegate(user, permissionPolicy) {
  this._user = user;
  this._permissionPolicy = permissionPolicy;
  this._fetchPromise = null;
}

GhRepoPolicyDelegate.prototype = {
  hasPolicy: Promise.method(function(policyName) {

    switch(policyName) {
      case 'GH_REPO_ACCESS':
        return this._fetch()
          .then(function(repoInfo) {
            return !!repoInfo;
          });

      case 'GH_REPO_PUSH':
        // Anonymous users will never
        // have push access, so why bother...
        if (!this._user) return false;

        return this._fetch()
          .then(function(repoInfo) {
            /* Can't see the repo? no access */
            if(!repoInfo) return false;

            var perms = repoInfo.permissions;
            return perms && (perms.push || perms.admin);
          });

      default:
        throw new StatusError(403, 'Invalid permissions');
    }
  }),

  /**
   * Returns a key used to skip checks
   */
  getPolicyRateLimitKey: function(policyName) {
    var uri = this._permissionPolicy.linkPath;
    var user = this._user;
    var userId = user && user._id;

    if (policyName === 'GH_REPO_PUSH' && !user) {
      return null;
    }

    return "GH_REPO:" + (userId || 'anon') + ":" + uri + ":" + policyName;
  },

  _fetch: function() {
    if (this._fetchPromise) {
      return this._fetchPromise;
    }

    var user = this._user;
    var uri = this._permissionPolicy.linkPath;

    var repoService = new GitHubRepoService(user);
    this._fetchPromise = repoService.getRepo(uri);
    // TODO: warn of privacy mismatch.....
    return this._fetchPromise;
  }
};

module.exports = GhRepoPolicyDelegate;
