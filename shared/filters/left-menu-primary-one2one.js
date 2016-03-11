'use strict';

var defaultFilter = require('./left-menu-primary-default.js');

module.exports = function leftMenuFavouriteOneToOne(room) {
  return defaultFilter(room) && room.githubType === 'ONETOONE';
};
