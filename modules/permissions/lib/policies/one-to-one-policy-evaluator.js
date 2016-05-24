'use strict';

var Promise = require('bluebird');
var debug = require('debug')('gitter:app:permissions:one-to-one-policy-evaluator');

function OneToOnePolicyEvaluator(user, securityDescriptor, contextDelegate) {
  this._user = user;
  this._contextDelegate = contextDelegate;
}

OneToOnePolicyEvaluator.prototype = {
  canRead: Promise.method(function() {
    if (!this._user) {
      debug('canRead: Denying anonymous user');
      return false;
    }
    var userId = this._user._id;

    if (!this._contextDelegate) {
      debug('canRead: Denying user without context');
      return false;
    }

    return this._contextDelegate.isMember(userId);
  }),

  canWrite: function() {
    return this.canRead();
  },

  canJoin: function() {
    return this.canRead();
  },

  canAdmin: function() {
    return Promise.resolve(false);
  },

  canAddUser: function() {
    return Promise.resolve(false);
  }
};

module.exports = OneToOnePolicyEvaluator;
