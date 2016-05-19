"use strict";

var logger = require('gitter-web-env').logger;
var userService = require("../../../services/user-service");
var Promise = require('bluebird');
var policyFactory = require('gitter-web-permissions/lib/legacy-policy-factory');

/**
 * Returns the permissions the user has in the orgs.
 * This is not intended to be used for large sets, rather individual items
 */
function TroupePermissionsStrategy(options) {
  this.currentUser = options.currentUser;
  this.currentUserId = options.currentUserId;
  this.isAdmin = null;
}

TroupePermissionsStrategy.prototype = {

  preload: function(troupes) {
    if (troupes.isEmpty()) return;

    var userPromise;
    if (this.currentUser) {
      userPromise = Promise.resolve(this.currentUser);
    } else {
      userPromise = userService.findById(this.currentUserId);
    }

    var isAdmin = {};

    return userPromise
      .then(function(user) {
        if (!user) return;

        return Promise.map(troupes.toArray(), function(troupe) {
          return policyFactory.createPolicyForRoom(user, troupe)
            .then(function(policy) {
              return policy.canAdmin();
            })
            .then(function(admin) {
              isAdmin[troupe.id] = admin;
            })
            .catch(function(err) {
              // Fallback in case of GitHub API downtime
              logger.error('Unable to obtain admin permissions', { exception: err });
              isAdmin[troupe.id] = false;
            });
        });
      })
      .bind(this)
      .then(function() {
        this.isAdmin = isAdmin;
      });
  },

  map: function(troupe) {
    return {
      admin: this.isAdmin[troupe.id] || false
    };
  },

  name: 'TroupePermissionsStrategy'
};

module.exports = TroupePermissionsStrategy;
