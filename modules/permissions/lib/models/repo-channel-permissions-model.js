"use strict";

var userIsInRoom = require('../user-in-room');
var commonPermissionsModel = require('./common-org-repo-channel-permissions-model');
var repoPermissionsModel = require('./repo-permissions-model');

/**
 * REPO_CHANNEL permissions model
 */
module.exports = commonPermissionsModel(repoPermissionsModel, userIsInRoom);
