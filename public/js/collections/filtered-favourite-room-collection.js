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

    initialize: function() {
      FilteredRoomCollection.prototype.initialize.apply(this, arguments);
      this.sort();
    },
    comparator: function(a, b){
      return sortAndFilters.favourites.sort(a, b);
    },

    filterDefault: sortAndFilters.favourites.filter,
    filterOneToOnes: function(model) {
      return one2oneFavouriteFilter(model.toJSON());
    },
    filterOrgRooms: function(model) {
      var orgName = this.roomModel.get('selectedOrgName');
      return orgFavouriteFilter(model.toJSON(), orgName);
    },
    getList: function (){
      this.models.forEach(function(model){
        console.log(model.get('url'), model.get('favourite'));
      });
    },
  }
);

module.exports = FilteredFavouriteCollection;
