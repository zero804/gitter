'use strict';

var defaultFilter = require('./left-menu-primary-default.js');

module.exports = function leftMenuFavouriteOrg(room, orgName) {
  return defaultFilter(room) && room.name.split('/')[0] === orgName && room.roomMember;
};
