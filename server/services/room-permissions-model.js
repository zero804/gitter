/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var permissionsModel   = require('./permissions-model');

/**
 * Main entry point
 */
function roomPermissionsModel(user, right, room) {
  return permissionsModel(user, right, room.uri, room.githubType, room.security);
}

module.exports = roomPermissionsModel;
