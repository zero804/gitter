'use strict';

var rawFilter = require('gitter-realtime-client/lib/sorts-filters').pojo.favourites.filter;
var modelFilter = require('gitter-realtime-client/lib/sorts-filters').model.favourites.filter;

module.exports = function defaultFavouritesFilter(room){
  return room.get ? modelFilter(room) : rawFilter(room);
};
