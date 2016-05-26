'use strict';

var Promise = require('bluebird');
var debug = require('debug')('gitter:app:permissions:legacy-github-policy-evaluator');
var permissionsModel = require('../permissions-model');

function LegacyGitHubPolicyEvaluator(user, uri, ghType, ghSecurity) {
  this.user = user;
  this.uri = uri;
  this.ghType = ghType;
  this.ghSecurity = ghSecurity;

  this._canRead = null;
  this._canWrite = null;
  this._canAdmin = null;
  this._canAddUser = null;
}

LegacyGitHubPolicyEvaluator.prototype = {
  canRead: Promise.method(function() {
    if (this._canRead) return this._canRead;

    debug('Will perform canRead');

    this._canRead = this._check('view');

    if (debug.enabled) {
      this._canRead.tap(function(result) {
        debug('canRead? %s', result);
      })
    }

    return this._canRead;
  }),

  canWrite: Promise.method(function() {
    if (this._canWrite) return this._canWrite;

    debug('Will perform canWrite');

    this._canWrite = this._check('join');

    if (debug.enabled) {
      this._canWrite.tap(function(result) {
        debug('canWrite? %s', result);
      })
    }

    return this._canWrite;
  }),

  /**
   *
   */
  canJoin: Promise.method(function() {
    return this.canWrite();
  }),

  canAdmin: Promise.method(function() {
    if (this._canAdmin) return this._canAdmin;

    debug('Will perform canAdmin');

    this._canAdmin = this._check('admin');

    if (debug.enabled) {
      this._canAdmin.tap(function(result) {
        debug('canAdmin? %s', result);
      })
    }

    return this._canAdmin;
  }),

  canAddUser: Promise.method(function() {
    if (this._canAddUser) return this._canAddUser;

    debug('Will perform canAddUser');

    this._canAddUser = this._check('adduser');

    if (debug.enabled) {
      this._canAddUser.tap(function(result) {
        debug('canAddUser? %s', result);
      })
    }

    return this._canAddUser;
  }),

  _check: function(right) {
    return permissionsModel(this.user, right, this.uri, this.ghType, this.ghSecurity);
  }


};

module.exports = LegacyGitHubPolicyEvaluator;
