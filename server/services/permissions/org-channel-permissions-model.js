/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userIsInRoom           = require('../user-in-room');
var premiumOrThrow         = require('./premium-or-throw');

var commonPermissionsModel = require('./common-org-repo-channel-permissions-model');
var orgPermissionsModel    = require('./org-permissions-model');

/**
 * ORG_CHANNEL permissions model
 */
module.exports = commonPermissionsModel(orgPermissionsModel, userIsInRoom, premiumOrThrow);
