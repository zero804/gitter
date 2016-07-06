'use strict';

var favouriteFilter = require('./left-menu-primary-favourite');
var getOrgNameFromUri = require('../get-org-name-from-uri');

module.exports = function leftMenuFavouriteOrg(room, orgName) {
  return favouriteFilter(room) && (getOrgNameFromUri(room.uri) === orgName) && room.roomMember;
};
