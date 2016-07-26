'use strict';

var defaultFilter = require('./left-menu-primary-default');

module.exports = function leftMenuFavouriteOrg(room, groupId) {
  return defaultFilter(room) && room.groupId === groupId && room.roomMember;
};
