"use strict";

var userIsInRoom = require('../user-in-room');
var commonPermissionsModel = require('./common-org-repo-channel-permissions-model');
var orgPermissionsModel = require('./org-permissions-model');

/**
 * ORG_CHANNEL permissions model
 */
module.exports = commonPermissionsModel(orgPermissionsModel, userIsInRoom);
