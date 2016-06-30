'use strict';

var defaultFilter = require('./left-menu-primary-default.js');
var getOrgNameFromUri = require('../get-org-name-from-uri');

module.exports = function leftMenuFavouriteOrg(room, orgName) {
  return defaultFilter(room) && (getOrgNameFromUri(room.uri) === orgName) && room.roomMember;
};
