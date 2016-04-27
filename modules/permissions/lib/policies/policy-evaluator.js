'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

function PolicyEvaluator(user, permissionPolicy, policyDelegate, contextDelegate) {
  this._user = user;
  this._permissionPolicy = permissionPolicy;
  this._policyDelegate = policyDelegate;
  this._contextDelegate = contextDelegate;
}

PolicyEvaluator.prototype = {
  canRead: Promise.method(function() {
    // TODO: ADD BANS
    // TODO: deal with one-to-one
    var user = this._user;
    var userId = user;
    var membersPolicy = this._permissionPolicy.members;

    if (membersPolicy === 'PUBLIC') {
      return true;
    }

    if (!userId) {
      // Anonymous users can only read public repos
      return false;
    }

    if (userIdIsIn(userId, this._permissionPolicy.extraMembers)) {
      return true;
    }

    var promiseChain = [];
    var contextDelegate = this._contextDelegate;
    var policyDelegate = this._policyDelegate;
    var self = this;

    if (membersPolicy === 'INVITE') {
      if (contextDelegate) {
        promiseChain.push(function() {
          return contextDelegate.isMember(userId);
        });
      }
    } else {
      if (policyDelegate) {
        promiseChain.push(function() {
          return policyDelegate.hasPolicy(membersPolicy);
        });
      }
    }

    promiseChain.push(function() {
      return self.canAdmin();
    });

    return executeChain(promiseChain);
  }),

  canJoin: Promise.method(function() {
    var user = this._user;
    if (!user) return false;

    /* Anonymous users can't join */

    return this.canRead();
  }),

  canAdmin: Promise.method(function() {
    var user = this._user;

    // Anonymous users are never admins
    if (!user) return false;

    var userId = user._id;
    var adminPolicy = this._permissionPolicy.admins;

    if (userIdIsIn(userId, this._permissionPolicy.extraAdmins)) {
      return true;
    }

    if (adminPolicy === 'MANUAL') {
      // If they're not in extraAdmins they're not an admin
      return false;
    }

    if (!this._policyDelegate) {
      /* No further policy delegate, so no */
      return false;
    }

    return this._policyDelegate.hasPolicy(adminPolicy);
  }),

  canAddUser: function() {
    // For now....
    return this.canJoin();
  }
};

/**
 * Given an array of promise generating functions
 * executes them from beginning to end until one
 * returns true or the chain ends
 */
function executeChain(promiseChain) {
  return (function next(access) {
    if (access) return true;
    var iter = promiseChain.shift();
    if (!iter) return false;
    return iter().then(next);
  })(false);
}

function userIdIsIn(userId, collection) {
  return _.some(collection, function(item) {
    return mongoUtils.objectIDsEqual(userId, item);
  });
}

module.exports = PolicyEvaluator;
