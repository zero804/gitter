'use strict';

var FilteredRoomCollection = require('./filtered-room-collection');

var sortAndFilters = require('gitter-realtime-client/lib/sorts-filters').model;
var one2oneFavouriteFilter = require('gitter-web-shared/filters/left-menu-primary-favourite-one2one');
var orgFavouriteFilter = require('gitter-web-shared/filters/left-menu-primary-favourite-org');

var FilteredFavouriteCollection = FilteredRoomCollection.extend({
  initialize: function(models, options) {
    FilteredRoomCollection.prototype.initialize.call(this, models, options);
    this.dndCtrl = options.dndCtrl;
    this.listenTo(this.dndCtrl, 'dnd:start-drag', this.onDragStart, this);
    this.listenTo(this.dndCtrl, 'dnd:end-drag', this.onDragEnd, this);
    this.listenTo(this.dndCtrl, 'room-menu:remove-favourite', this.onRemoveFavourite, this);
  },

  comparator: sortAndFilters.favourites.sort,

  /**
   * The base filter for this collection
   */
  filterFn: function(model) {
    return model.get('favourite') && model.get('lastAccessTime');
  },

  visiblePredicates: {
    people: function(model) {
      return one2oneFavouriteFilter(model.attributes);
    },

    search: function() {
      return false;
    },

    org: function(model) {
      var orgName = this.roomModel.get('selectedOrgName');
      return orgFavouriteFilter(model.attributes, orgName);
    },

    default: sortAndFilters.favourites.filter
  },

  //When we start dragging an element we want to display all the
  //items within the favourite collection so a user can order it properly
  //JP 1/4/16
  onDragStart: function () {
    var originalFilter = this._visiblePredicate;

    //Set a property on the item views model
    //to denote if this model would normally be in the collection

    //At this point this.models represents the filtered models,
    //as in, only favourites that are one-to-one for example
    //so we have to filter this down from the initial collection  with the defaultFavouritesFilter (this.filterDefault)
    this.forEach(function(model) {
      var isVisible = originalFilter(model);
      model.set('isTempItem', !isVisible);
    });

    this.setVisibilePredicate(this.visiblePredicates.default);
  },

  onDragEnd: function () {
    this.forEach(function(model) {
      model.set('isTempItem', false);
    })

    // Reapply the original visiblePredicates to remove
    // the temp items
    this.onModelChangeState();
  },

  onRemoveFavourite: function (id){
    var model = this.findWhere({ id: id });
    if(model) {
      model.set('favourite', false);
      model.save();
    }
  },

});

module.exports = FilteredFavouriteCollection;
