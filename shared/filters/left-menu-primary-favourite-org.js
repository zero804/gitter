'use strict';

var favouriteFilter = require('./left-menu-primary-favourite');

module.exports = function leftMenuFavouriteOrg(room, groupId) {
  var id = room.groupId + '';
  return favouriteFilter(room) && id === groupId && room.roomMember;
};
