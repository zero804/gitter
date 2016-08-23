'use strict';

var Promise = require('bluebird');
var debug = require('debug')('gitter:app:permissions:pre-creation:gh-repo-policy-evaluator');
var PolicyDelegateTransportError = require('../policies/policy-delegate-transport-error');
var GitHubRepoService = require('gitter-web-github').GitHubRepoService;
var isGitHubUser = require('gitter-web-identity/lib/is-github-user');

function GitHubRepoPolicyEvaluator(user, uri) {
  this.user = user;
  this.uri = uri;

  this._canRead = null;
  this._canAdmin = null;
  this._canAddUser = null;
  this._fetchPromise = null;
}

GitHubRepoPolicyEvaluator.prototype = {
  canRead: Promise.method(function() {
    if (this._canRead) return this._canRead;

    debug('Will perform canRead');

    this._canRead = this._fetch()
      .then(function(repo) {
        // If you can see the repo, you can read it
        return !!repo;
      });

    if (debug.enabled) {
      this._canRead.tap(function(result) {
        debug('canRead? %s', result);
      })
    }

    return this._canRead;
  }),

  canWrite: Promise.method(function() {
    return this.canRead();
  }),

  /**
   *
   */
  canJoin: Promise.method(function() {
    return this.canRead();
  }),

  canAdmin: Promise.method(function() {
    // Non github users will never be an admin
    if (!isGitHubUser(this.user)) return false;

    if (this._canAdmin) return this._canAdmin;

    debug('Will perform canAdmin');


    this._canAdmin = this._fetch()
      .then(function(repo) {
        if (!repo) return false;
        var perms = repo.permissions;
        var result = perms && (perms.push || perms.admin);
        return !!result;
      });

    if (debug.enabled) {
      this._canAdmin.tap(function(result) {
        debug('canAdmin? %s', result);
      })
    }

    return this._canAdmin;
  }),

  canAddUser: Promise.method(function() {
    // You can never add a user to a room which has not yet been created
    return false;
  }),

  _fetch: function() {
    if (this._fetchPromise) {
      return this._fetchPromise;
    }

    debug('Fetching repo %s from github', this.uri);

    var repoService = new GitHubRepoService(this.user);
    this._fetchPromise = repoService.getRepo(this.uri)
      .catch(function(err) {
        debug('Exeception while fetching repo')

        if(err.errno && err.syscall || err.statusCode >= 500) {
          // GitHub call failed and may be down.
          throw new PolicyDelegateTransportError(err.message);
        }

        throw err;
      });

    return this._fetchPromise;
  }

};

module.exports = GitHubRepoPolicyEvaluator;
