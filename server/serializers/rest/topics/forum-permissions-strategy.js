"use strict";

var logger = require('gitter-web-env').logger;
var userService = require("../../../services/user-service");
var Promise = require('bluebird');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');

function ForumPermissionsStrategy(options) {
  this.currentUser = options.currentUser;
  this.currentUserId = options.currentUserId;
  this.isAdmin = null;
}

ForumPermissionsStrategy.prototype = {

  preload: function(forums) {
    if (forums.isEmpty()) return;

    var currentUser = this.currentUser;
    var currentUserId = this.currentUserId;

    return Promise.try(function() {
        if (currentUser) {
          return currentUser;
        }

        if (currentUserId) {
          return userService.findById(currentUserId)
        }
      })
      .bind(this)
      .then(function(user) {
        var isAdmin = this.isAdmin = {};

        if (!user) return;

        return Promise.map(forums.toArray(), function(forum) {
          return policyFactory.createPolicyForForum(user, forum)
            .then(function(policy) {
              return policy.canAdmin();
            })
            .then(function(admin) {
              isAdmin[forum.id] = admin;
            })
            .catch(function(err) {
              // Fallback in case of GitHub API downtime
              logger.error('Unable to obtain admin permissions', { exception: err });
              isAdmin[forum.id] = false;
            });
        });
      });
  },

  map: function(forum) {
    return {
      admin: this.isAdmin[forum.id] || false
    };
  },

  name: 'ForumPermissionsStrategy'
};

module.exports = ForumPermissionsStrategy;
