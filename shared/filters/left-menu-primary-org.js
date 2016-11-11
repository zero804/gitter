'use strict';

var defaultFilter = require('./left-menu-primary-default');

module.exports = function leftMenuFavouriteOrg(room, groupId) {
  var roomGroupId = room.groupId;
  if(room.groupId && room.groupId.toString) { roomGroupId = room.groupId.toString(); }
  if(groupId && groupId.toString) { groupId = groupId.toString(); }
  return defaultFilter(room) && roomGroupId === groupId && room.roomMember;
};
