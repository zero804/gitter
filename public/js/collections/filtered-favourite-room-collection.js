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

    initialize: function(attrs) {
      FilteredRoomCollection.prototype.initialize.apply(this, arguments);
      this.dndCtrl = attrs.dndCtrl;
      this.listenTo(this.dndCtrl, 'dnd:start-drag', this.onDragStart, this);
      this.listenTo(this.dndCtrl, 'dnd:end-drag', this.onDragEnd, this);
      this.sort();
    },

    comparator: function(a, b) {
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

    onDragStart: function (){
      this.oldFilter = this.getFilter();
      this.setFilter(this.filterDefault);
      console.log('drag start');
    },

    onDragEnd: function (){
      this.setFilter(this.oldFilter);
      console.log('drag end');
    },
  }
);

module.exports = FilteredFavouriteCollection;
