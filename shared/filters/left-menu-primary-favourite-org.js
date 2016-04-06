'use strict';

var favouriteFilter = require('./left-menu-primary-favourite');
var getTroupeNameFromOrgName = require('../get-org-name-from-troupe-name');

module.exports = function leftMenuFavouriteOrg(room, orgName) {
  return favouriteFilter(room) && (getTroupeNameFromOrgName(room.name) === orgName) && room.roomMember;
};
