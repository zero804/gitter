/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var permissionsModel   = require('./permissions-model');

/**
 * Main entry point
 */
function roomPermissionsModel(user, right, room) {
  if(room.oneToOne) {
    /* TODO: pass the user through */
    return permissionsModel(user, right, null, room.githubType, room.security);
  }

  return permissionsModel(user, right, room.uri, room.githubType, room.security);
}

module.exports = roomPermissionsModel;
