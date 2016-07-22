'use strict';

var favouriteFilter = require('./left-menu-primary-favourite');

module.exports = function leftMenuFavouriteOrg(room, groupId) {
  console.log('filter');
  return favouriteFilter(room) && room.groupId === groupId && room.roomMember;
};
