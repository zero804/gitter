"use strict";

var Promise = require('bluebird');
var permissionsModel = require('gitter-web-permissions/lib/permissions-model');

/**
 * Main entry point
 */
function roomPermissionsModel(user, right, room) {
  if (room && room.oneToOne) {
    /*
     * TODO: pass the username of the other user through.
     * For the moment, we don't use it, so don't worry too
     * much yet.
     */
    return permissionsModel(user, right, null, room.githubType, room.security);
  }

  return permissionsModel(user, right, room.uri, room.githubType, room.security);
}

module.exports = Promise.method(roomPermissionsModel);
