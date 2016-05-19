'use strict';

var Promise = require('bluebird');
var persistence = require('gitter-web-persistence');
var StatusError = require('statuserror');

function LegacyGroupPolicyEvaluator(userId, user, groupId, group) {
  this._userId = userId;
  if (this._userId) {
    this._userPromise = user && Promise.resolve(user);
  } else {
    // No userId, so user is always null
    this._userPromise = Promise.resolve(null);
  }

  this._groupId = groupId;
  this._groupPromise = group && Promise.resolve(group);

  this._canRead = null;
  this._canWrite = null;
  this._canJoin = null;
  this._canAdmin = null;
  this._canAddUser = null;
  this._fetchOtherUserPromise = null;
}

LegacyGroupPolicyEvaluator.prototype = {
  canRead: Promise.method(function() {
    throw new StatusError(500, 'Not implemented');
  }),

  canWrite: Promise.method(function() {
    throw new StatusError(500, 'Not implemented');
  }),

  /**
   * Similar to canRead, but with a full access check
   */
  canJoin: Promise.method(function() {
    throw new StatusError(500, 'Not implemented');
  }),

  canAdmin: Promise.method(function() {
    throw new StatusError(500, 'Not implemented');
  }),

  canAddUser: Promise.method(function() {
    throw new StatusError(500, 'Not implemented');
  }),

  _fetchUser: function() {
    if (this._userPromise) return this._userPromise;

    this._userPromise = persistence.User.findById(this._userId, null, { lean: true })
      .exec();

    return this._userPromise;
  },

  _fetchGroup: function() {
    if (this._groupPromise) return this._groupPromise;

    this._groupPromise = persistence.Group.findById(this._groupId, null, { lean: true })
      .exec();

    return this._groupPromise;
  },

};

module.exports = LegacyGroupPolicyEvaluator;
