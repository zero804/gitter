'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

function OneToOnePolicyEvaluator(user, permissionPolicy) {
  this._user = user;
  this._permissionPolicy = permissionPolicy;
}

OneToOnePolicyEvaluator.prototype = {
  canRead: function() {
    if (!this._user) {
      return Promise.resolve(false);
    }
    var userId = this._user._id;

    var allowed = userIdIsIn(userId, this._permissionPolicy.oneToOneUsers);
    return Promise.resolve(allowed);
  },

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

function userIdIsIn(userId, collection) {
  return _.some(collection, function(item) {
    return mongoUtils.objectIDsEqual(userId, item.userId);
  });
}

module.exports = OneToOnePolicyEvaluator;
