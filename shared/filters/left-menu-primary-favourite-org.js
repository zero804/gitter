'use strict';

var favouriteFilter = require('./left-menu-primary-favourite');

module.exports = function leftMenuFavouriteOrg(room, groupId) {
  var id = '';
  if(room.groupId && room.groupId.toString) { id = room.groupId.toString(); }
  return favouriteFilter(room) && id === groupId && room.roomMember;
};
