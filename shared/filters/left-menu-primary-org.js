'use strict';

var defaultFilter            = require('./left-menu-primary-default.js');
var getTroupeNameFromOrgName = require('../get-org-name-from-troupe-name');

module.exports = function leftMenuFavouriteOrg(room, orgName) {
  return defaultFilter(room) && (getTroupeNameFromOrgName(room.name) === orgName) && room.roomMember;
};
