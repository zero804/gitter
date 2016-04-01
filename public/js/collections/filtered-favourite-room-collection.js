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

    //When we start dragging an element we want to display all the
    //items within the favourite collection so a user can order it properly
    //JP 1/4/16
    onDragStart: function () {
      this.oldFilter = this.getFilter();

      //Set a property on the item views model
      //to denote if this model would normally be in the collection

      //At this point this.models represents the filtered models,
      //as in, only favourites that are one-to-one for example
      //so we have to filter this down from the initial collection  with the defaultFavouritesFilter (this.filterDefault)
      this.collection.models.filter(this.filterDefault).forEach(function(model) {
        model.set('isTempItem', !this.oldFilter(model));
      }.bind(this));

      this.setFilter(this.filterDefault);
    },

    onDragEnd: function () {
      //reset the models back to their orignal filtered state
      this.setFilter(this.oldFilter);
    },
  }
);

module.exports = FilteredFavouriteCollection;
