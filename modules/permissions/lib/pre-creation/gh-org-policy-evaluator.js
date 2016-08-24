
'use strict';

var Promise = require('bluebird');
var debug = require('debug')('gitter:app:permissions:pre-creation:gh-org-policy-evaluator');
var PolicyDelegateTransportError = require('../policies/policy-delegate-transport-error');
var GitHubOrgService = require('gitter-web-github').GitHubOrgService;
var isGitHubUser = require('gitter-web-identity/lib/is-github-user');

function GitHubRepoPolicyEvaluator(user, uri) {
  this.user = user;
  this.uri = uri;

  this._canAccessPromise = null;
}

GitHubRepoPolicyEvaluator.prototype = {
  canRead: Promise.method(function() {
    return this._canAccess();
  }),

  canWrite: Promise.method(function() {
    return this._canAccess();
  }),

  canJoin: Promise.method(function() {
    return this._canAccess();
  }),

  canAdmin: Promise.method(function() {
    return this._canAccess();
  }),

  canAddUser: Promise.method(function() {
    // You can never add a user to a room which has not yet been created
    return false;
  }),

  _canAccess: function() {
    if (!this.user || !this.user.username) return false;

    // Non github users will never be an org member
    if (!isGitHubUser(this.user)) return false;

    if (this._canAccessPromise) {
      return this._canAccessPromise;
    }

    debug('Fetching org %s from github', this.uri);

    var ghOrg = new GitHubOrgService(this.user);
    this._canAccessPromise = ghOrg.member(this.uri, this.user.username)
      .catch(function(err) {
        debug('Exeception while fetching org')

        if(err.errno && err.syscall || err.statusCode >= 500) {
          // GitHub call failed and may be down.
          throw new PolicyDelegateTransportError(err.message);
        }

        throw err;
      })
      .then(function(isMember) {
        return !!isMember;
      });

    return this._canAccessPromise;
  }
};

module.exports = GitHubRepoPolicyEvaluator;
