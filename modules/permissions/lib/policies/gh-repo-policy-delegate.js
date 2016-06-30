'use strict';

var Promise = require('bluebird');
var GitHubRepoService = require('gitter-web-github').GitHubRepoService;
var PolicyDelegateTransportError = require('./policy-delegate-transport-error');
var debug = require('debug')('gitter:app:permissions:gh-repo-policy-delegate');

function GhRepoPolicyDelegate(userId, userLoader, securityDescriptor) {
  this._userId = userId;
  this._userLoader = userLoader;
  this._securityDescriptor = securityDescriptor;
  this._fetchPromise = null;
}

GhRepoPolicyDelegate.prototype = {
  hasPolicy: Promise.method(function(policyName) {
    debug('Checking policy %s', policyName);

    switch(policyName) {
      case 'GH_REPO_ACCESS':
        // Shortcut for public repos
        if (this._securityDescriptor.public) {
          debug('Allowing access for public room');
          return true;
        }

        return this._fetch()
          .then(function(repoInfo) {
            var result = !!repoInfo;
            debug('Access check returned %s', result);
            return result;
          });

      case 'GH_REPO_PUSH':
        // Anonymous users will never
        // have push access, so why bother...
        if (!this._userId) {
          debug('Denying access for anonymous user');
          return false;
        }

        return this._fetch()
          .then(function(repoInfo) {
            /* Can't see the repo? no access */
            if(!repoInfo) {
              debug('User is unable to see repository, denying access');
              return false;
            }

            var perms = repoInfo.permissions;
            var result = perms && (perms.push || perms.admin);
            debug('Access check returned %s', result);
            return result;
          });

      default:
        debug('Unknown permission, denying access');
        return false;
    }
  }),

  /**
   * Returns a key used to skip checks
   */
  getPolicyRateLimitKey: function(policyName) {
    var uri = this._securityDescriptor.linkPath;
    var userId = this._userId;

    if (policyName === 'GH_REPO_PUSH' && !userId) {
      return null;
    }

    return "GH_REPO:" + (userId || 'anon') + ":" + uri + ":" + policyName;
  },

  _fetch: function() {
    if (this._fetchPromise) {
      return this._fetchPromise;
    }

    var uri = this._securityDescriptor.linkPath;
    debug('Fetching repo %s from github', uri);

    this._fetchPromise = this._userLoader()
      .then(function(user) {
        var repoService = new GitHubRepoService(user);
        return repoService.getRepo(uri);
      })
      .catch(function(err) {
        debug('Exeception while fetching repo')

        if(err.errno && err.syscall || err.statusCode >= 500) {
          // GitHub call failed and may be down.
          // We can fall back to whether the user is already in the room
          throw new PolicyDelegateTransportError(err.message);
        }

        throw err;
      });

    // TODO: warn of privacy mismatch.....
    return this._fetchPromise;
  }
};

module.exports = GhRepoPolicyDelegate;
