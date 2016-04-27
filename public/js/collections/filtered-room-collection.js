'use strict';

var Backbone = require('backbone');
var FilteredCollection = require('backbone-filtered-collection');

//Filters
var one2oneFilter  = require('gitter-web-shared/filters/left-menu-primary-one2one');
var orgFilter      = require('gitter-web-shared/filters/left-menu-primary-org');
var sortAndFilters = require('gitter-realtime-client/lib/sorts-filters').model;

var FilteredRoomCollection = Backbone.Collection.extend({

  _filter: null,
  initialize: function(models, options) { //jshint unused: true
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

    this.onModelChangeState();
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

  onFavouriteChange: function () {
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

  setFilter: function (filterFn) {
    //If we have no current filter fall back to the default
    if (!this._filter) { this._filter = this.filterDefault; }

    //use the filter provided or the last filter used
    var filter = this._filter = (filterFn || this._filter);

    //set isHidden on models that need to be hidden
    this.forEach(function(model) {
      model.set('isHidden', !filter(model));
    });

    //trigger event to signal complete filtering
    this.trigger('filter-complete');
  },

  getFilter: function (){
    return (this._filter || this.filterDefault);
  },

});

module.exports = FilteredRoomCollection;
