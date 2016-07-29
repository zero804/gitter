'use strict';

var defaultFilter = require('./left-menu-primary-default');

module.exports = function leftMenuFavouriteOrg(room, groupId) {
  var id = room.groupId + '';
  return defaultFilter(room) && id === groupId && room.roomMember;
};
