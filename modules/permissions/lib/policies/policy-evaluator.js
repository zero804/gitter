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

    if (membersPolicy === 'INVITE' && this._contextDelegate) {
      return this._contextDelegate.isMember(userId)
        .bind(this)
        .then(function(hasAccess) {
          if (hasAccess) return true;

          // Last ditch for invite: Admins can always read...
          return this.canAdmin();
        });
    }

    // Admins can always read...
    if (this.canAdmin()) {
      return true;
    }

    if (!this._policyDelegate) return false;

    return this._policyDelegate.hasPolicy(membersPolicy);
  }),

  canJoin: Promise.method(function() {
    var user = this._user;
    if (!user) return false;

    /* Anonymous users can't join */

    return this.canRead();
  }),

  canAdmin: Promise.method(function() {
    var user = this._user;
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

    if (!this._policyDelegate) return false;

    return this._policyDelegate.hasPolicy(adminPolicy);
  }),

  canAddUser: function() {
    // For now....
    return this.canJoin();
  }
};

function userIdIsIn(userId, collection) {
  return _.some(collection, function(item) {
    return mongoUtils.objectIDsEqual(userId, item);
  });
}

module.exports = PolicyEvaluator;
