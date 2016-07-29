'use strict';

var defaultFilter = require('./left-menu-primary-default');

module.exports = function leftMenuFavouriteOrg(room, groupId) {
  var id = '';
  if(room.groupId && room.groupId.toString) { id = room.groupId.toString(); }
  return defaultFilter(room) && id === groupId && room.roomMember;
};
