'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var policyCheckRateLimiter = require('./policy-check-rate-limiter');
var debug = require('debug')('gitter:permissions:policy-evaluator');

function PolicyEvaluator(user, permissionPolicy, policyDelegate, contextDelegate) {
  this._user = user;
  this._permissionPolicy = permissionPolicy;
  this._policyDelegate = policyDelegate;
  this._contextDelegate = contextDelegate;
}

PolicyEvaluator.prototype = {
  canRead: Promise.method(function() {
    debug('canRead');
    // TODO: ADD BANS
    var user = this._user;
    var userId = user;
    var membersPolicy = this._permissionPolicy.members;

    if (membersPolicy === 'PUBLIC') {
      debug('canRead: allowing access to PUBLIC');
      // Shortcut for PUBLIC rooms - always allow everyone to read them
      return true;
    }

    if (userId && userIdIsIn(userId, this._permissionPolicy.extraMembers)) {
      // If the user is in extraMembers, always allow them
      // in...
      debug('canRead: allowing access to extraMember');
      return true;
    }

    var promiseChain = [];
    var contextDelegate = this._contextDelegate;

    if (membersPolicy === 'INVITE') {
      // INVITE rooms don't defer to the policyDelegate
      // Anonymous users can see INVITE rooms
      if (userId && contextDelegate) {
        promiseChain.push(function() {
          debug('canRead: checking isMember');
          return contextDelegate.isMember(userId);
        });
      }
    } else {
      // For non invite rooms, defer to the policyDelegate
      var policyDelegate = this._policyDelegate;

      if (policyDelegate) {
        var rateLimitKey = policyDelegate.getPolicyRateLimitKey(membersPolicy);

        if (userId && contextDelegate && rateLimitKey) {
          // Performance optimisation:
          //
          // If the user is already in the room and has recently
          // done a full check, skip the full check and rely on
          // the fact that the user is already in the room
          promiseChain.push(function() {
            return contextDelegate.isMember(userId)
              .then(function(access) {
                if (!access) return false;

                // The user is already in the room
                // check whether we've done a recent
                // full check on them...
                return policyCheckRateLimiter.checkForRecentSuccess(rateLimitKey);
              });
          });
        }

        promiseChain.push(function() {
          debug('canRead: checking hasPolicy: %s', membersPolicy);
          var promise = policyDelegate.hasPolicy(membersPolicy);

          if (rateLimitKey) {
            // If we have a rate limit key, record the success, if any
            // so that we can skip this check for a while
            promise.tap(function(access) {
              if (access) {
                return policyCheckRateLimiter.recordSuccessfulCheck(rateLimitKey, 300);
              }
            });
          }

          return promise;
        });
      }
    }

    // Admin users can always read a room,
    // so check if the user is an admin
    if (userId) {
      var self = this;
      promiseChain.push(function() {
        debug('canRead: checking canAdmin');
        return self.canAdmin();
      });
    }

    return executeChain(promiseChain);
  }),

  canWrite: Promise.method(function() {
    var user = this._user;
    // Anonymous users can never write to a room
    if (!user) return false;

    return this.canRead();
  }),

  canJoin: Promise.method(function() {
    var user = this._user;
    if (!user) return false;

    /* Anonymous users can't join */

    return this.canRead();
  }),

  canAdmin: Promise.method(function() {
    debug('canAdmin');

    var user = this._user;

    // Anonymous users are never admins
    if (!user) {
      debug('canAdmin: deny access for anonymous');
      return false;
    }

    var userId = user._id;
    var adminPolicy = this._permissionPolicy.admins;

    if (userIdIsIn(userId, this._permissionPolicy.extraAdmins)) {
      // The user is in extraAdmins...
      debug('canAdmin: allow access for extraAdmin');
      return true;
    }

    if (adminPolicy === 'MANUAL') {
      debug('canAdmin: deny access for no extraAdmin');
      // If they're not in extraAdmins they're not an admin
      return false;
    }

    if (!this._policyDelegate) {
      debug('canAdmin: deny access no policy delegate');

      /* No further policy delegate, so no */
      return false;
    }

    debug('canAdmin: checking policy delegate with policy %s', adminPolicy);
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
  if (!promiseChain.length) return false;
  if (promiseChain.length === 1) return promiseChain[0]();

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
