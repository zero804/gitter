'use strict';

var _                      = require('underscore');
var FilteredRoomCollection = require('./filtered-room-collection');

var sortAndFilters         = require('gitter-realtime-client/lib/sorts-filters').model;
var one2oneFavouriteFilter = require('gitter-web-shared/filters/left-menu-primary-favourite-one2one');
var orgFavouriteFilter     = require('gitter-web-shared/filters/left-menu-primary-favourite-org');

var FilteredFavouriteCollection = function() {
  FilteredRoomCollection.apply(this, arguments);
};

_.extend(
  FilteredFavouriteCollection.prototype,
  FilteredRoomCollection.prototype, {
    filterDefault: sortAndFilters.favourites.filter,
    comparator:    sortAndFilters.favourites.sort,
    filterOneToOnes: function(model) {
      //if(model.get('name') === 'pastey151') { debugger; }
      return false;
      //return one2oneFavouriteFilter(model.toJSON());
    },
    filterOrgRooms: function(model) {
      var orgName = this.roomModel.get('selectedOrgName');
      return orgFavouriteFilter(model.toJSON(), orgName);
    },
  }
);

module.exports = FilteredFavouriteCollection;
