'use strict';

var sortAndFilters = require('gitter-realtime-client/lib/sorts-filters').model;

module.exports = function generateLeftMenuFavouriteGroupsList(groups) {
  return groups
    .filter(sortAndFilters.favourites.filter)
    .sort(sortAndFilters.favourites.sort);
};
