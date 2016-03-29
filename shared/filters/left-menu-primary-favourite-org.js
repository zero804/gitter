'use strict';

var favouriteFilter = require('./left-menu-primary-favourite');

module.exports = function leftMenuFavouriteOrg(room, orgName) {
  return favouriteFilter(room) && room.name.split('/')[0] === orgName && room.roomMember;
};
