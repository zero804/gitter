"use strict";

var logger = require('gitter-web-env').logger;
var userService = require("../../../services/user-service");
var roomPermissionsModel = require('gitter-web-permissions/lib/room-permissions-model');
var Promise = require('bluebird');

/** Returns the permissions the user has in the orgs. This is not intended to be used for large sets, rather individual items */
function TroupePermissionsStrategy(options) {
  var isAdmin = {};

  function getUser() {
    if (options.currentUser) return Promise.resolve(options.currentUser);
    return userService.findById(options.currentUserId);
  }

  this.preload = function(troupes) {
    if (troupes.isEmpty()) return;

    return getUser()
      .then(function(user) {
        if (!user) return;

        return Promise.map(troupes.toArray(), function(troupe) {
          return roomPermissionsModel(user, 'admin', troupe)
            .then(function(admin) {
              isAdmin[troupe.id] = admin;
            })
            .catch(function(err) {
              // Fallback in case of GitHub API downtime
              logger.error('Unable to obtain admin permissions', { exception: err });
              isAdmin[troupe.id] = false;
            });
        });
      });
  };

  this.map = function(troupe) {
    return {
      admin: isAdmin[troupe.id] || false
    };
  };
}

TroupePermissionsStrategy.prototype = {
  name: 'TroupePermissionsStrategy'
};

module.exports = TroupePermissionsStrategy;
