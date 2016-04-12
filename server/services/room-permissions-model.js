"use strict";

var _ = require('lodash');
var Promise = require('bluebird');
var permissionsModel = require('./permissions-model');
var identityService = require("./identity-service");
var userCanJoinRoom = require("gitter-web-shared/rooms/user-can-join-room");


var checkJoinProviders = Promise.method(function(user, right, room) {
  // This only affects joiningrooms, so we pass through it successfully if that
  // doesn't apply.
  if (right != 'join') {
    return true;
  }

  // Don't bother loading in all the user's providers if the room allows all
  // providers anyway.
  if (room.providers && room.providers.length) {
    return identityService.listProvidersForUser(user)
      .then(function(userProviders) {
        return userCanJoinRoom(userProviders, room.providers);
      });
  } else {
    return true;
  }
});

/**
 * Main entry point
 */
function roomPermissionsModel(user, right, room) {
  return checkJoinProviders(user, right, room)
    .then(function(allowed) {
      if (!allowed) {
        return false;
      }

      if (room && room.oneToOne) {
        /*
         * TODO: pass the username of the other user through.
         * For the moment, we don't use it, so don't worry too
         * much yet.
         */
        return permissionsModel(user, right, null, room.githubType, room.security);
      }

      return permissionsModel(user, right, room.uri, room.githubType, room.security);
    });
}

module.exports = roomPermissionsModel;
