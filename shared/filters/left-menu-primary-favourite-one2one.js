'use strict';

var favouriteFilter = require('./left-menu-primary-favourite');

module.exports = function leftMenuFavouriteOneToOne(room) {
  return favouriteFilter(room) && room.githubType === 'ONETOONE';
};
