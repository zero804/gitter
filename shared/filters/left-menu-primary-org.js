'use strict';

var defaultFilter            = require('./left-menu-primary-default.js');
var getTroupeNameFromORgName = require('../get-org-name-from-troupe-name');

module.exports = function leftMenuFavouriteOrg(room, orgName) {
  return defaultFilter(room) && (getTroupeNameFromORgName(room.name) === orgName) && room.roomMember;
};
