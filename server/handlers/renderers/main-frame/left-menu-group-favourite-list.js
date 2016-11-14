'use strict';

var sortAndFilters = require('gitter-realtime-client/lib/sorts-filters').pojo;

function generateLeftMenuFavouriteGroupsList(groups) {
  return groups
    .filter(sortAndFilters.favourites.filter)
    .sort(sortAndFilters.favourites.sort);
}

module.exports = generateLeftMenuFavouriteGroupsList;
