'use strict';

var favouriteFilter = require('./left-menu-primary-favourite');

module.exports = function leftMenuFavouriteOrg(room, groupId) {
  var roomGroupId = room.groupId;
  if(room.groupId && room.groupId.toString) { roomGroupId = room.groupId.toString(); }
  if(groupId && groupId.toString) { groupId = groupId.toString(); }
  return favouriteFilter(room) && roomGroupId === groupId && room.roomMember;
};
