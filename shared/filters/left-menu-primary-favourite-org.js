'use strict';

var favouriteFilter = require('./left-menu-primary-favourite');

module.exports = function leftMenuFavouriteOrg(room, groupId) {
  return favouriteFilter(room) && room.groupId === groupId && room.roomMember;
};
