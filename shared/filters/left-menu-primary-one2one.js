'use strict';

var defaultFilter = require('./left-menu-primary-default');

module.exports = function leftMenuFavouriteOneToOne(room) {
  return defaultFilter(room) && room.oneToOne;
};
