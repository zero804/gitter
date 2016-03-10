'use strict';

var defaultFilter = require('./left-menu-primary-default.js');

module.exports = function leftMenuFavouriteOneToOne(room) {
  console.log(defaultFilter(room), room.githubType, room.name, room.lastAccessTime, room.unreadItems, room.mentions);
  return defaultFilter(room) && room.githubType === 'ONETOONE';
};
