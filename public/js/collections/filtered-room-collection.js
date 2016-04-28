'use strict';

var FilteredCollection = require('backbone-filtered-collection');
var _                  = require('underscore');

//Filters
var one2oneFilter  = require('gitter-web-shared/filters/left-menu-primary-one2one');
var orgFilter      = require('gitter-web-shared/filters/left-menu-primary-org');
var sortAndFilters = require('gitter-realtime-client/lib/sorts-filters').model;

var FilteredRoomCollection = function() {
  FilteredCollection.apply(this, arguments);
};

FilteredRoomCollection.prototype = _.extend(
  FilteredRoomCollection.prototype,
  FilteredCollection.prototype, {

  initialize: function(options) {
    if (!options || !options.roomModel) {
      throw new Error('A valid RoomMenuModel must be passed to a new instance of FilteredRoomCollection');
    }

    this.roomModel = options.roomModel;
    this.listenTo(this.roomModel, 'change:state', this.onModelChangeState, this);
    this.listenTo(this.roomModel, 'change:selectedOrgName', this.onOrgNameChange, this);


    if (!options || !options.collection) {
      throw new Error('A valid RoomCollection must be passed to a new instance of FilteredRoomCollection');
    }

    this.roomCollection = options.collection;
    this.listenTo(this.roomCollection, 'snapshot', this.onRoomCollectionSnapshot, this);
    this.listenTo(this, 'filter-complete change:escalationTime change:activity change:unreadItems change:mentions', this.sort, this);
    this.listenTo(this, 'change:favourite', this.onFavouriteChange, this);

    FilteredCollection.prototype.initialize.apply(this, arguments);
    this.onModelChangeState();
    this.onOrgNameChange();
  },

  onModelChangeState: function() {
    switch (this.roomModel.get('state')) {

      case 'people' :
        this.setFilter(this.filterOneToOnes.bind(this));
        break;
      case 'search' :
        this.setFilter(this.filterSearches.bind(this));
        break;
      case 'org' :
        this.setFilter(this.filterOrgRooms.bind(this));
        break;
      default:
        this.setFilter(this.filterDefault);
        break;
    }
  },

  onOrgNameChange: function() {
    this.setFilter();
  },

  onFavouriteChange: function (){
    this.setFilter();
  },

  filterDefault:   sortAndFilters.recents.filter,
  filterFavourite: sortAndFilters.favourites.filter,

  filterOneToOnes: function(model) {
    return one2oneFilter(model.toJSON());
  },

  filterSearches: function() {
    return false;
  },

  filterOrgRooms: function(model) {
    var orgName = this.roomModel.get('selectedOrgName');
    return orgFilter(model.toJSON(), orgName);
  },

  onRoomCollectionSnapshot: function() {
    var args = Array.prototype.slice.call(arguments);
    this.trigger.apply(this, ['snapshot'].concat(args));
  },

  comparator:     sortAndFilters.recents.sort,

});

module.exports = FilteredRoomCollection;
