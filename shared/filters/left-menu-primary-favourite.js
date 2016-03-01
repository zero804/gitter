'use strict';

var defaultFilter = require('./left-menu-primary-default.js');

module.exports = function leftMenuFavouriteFilter(room) {
  return defaultFilter(room) && !!room.favourite;
};
