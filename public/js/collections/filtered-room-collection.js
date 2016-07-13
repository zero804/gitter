'use strict';

var Backbone = require('backbone');

//Filters
var one2oneFilter = require('gitter-web-shared/filters/left-menu-primary-one2one');
var orgFilter = require('gitter-web-shared/filters/left-menu-primary-org');
var sortAndFilters = require('gitter-realtime-client/lib/sorts-filters').model;
var defaultCollectionFilter = require('gitter-web-shared/filters/left-menu-primary-default');
var FilteredRoomCollection = Backbone.Collection.extend({

  _filter: null,
  initialize: function(models, options) { //jshint unused: true
    if (!options || !options.roomModel) {
      throw new Error('A valid RoomMenuModel must be passed to a new instance of FilteredRoomCollection');
    }

    this.roomModel = options.roomModel;
    this.listenTo(this.roomModel, 'change:state', this.onModelChangeState);
    this.listenTo(this.roomModel, 'change:selectedOrgName', this.onOrgNameChange);


    if (!options || !options.collection) {
      throw new Error('A valid RoomCollection must be passed to a new instance of FilteredRoomCollection');
    }

    this.roomCollection = options.collection;
    this.listenTo(this.roomCollection, 'snapshot', this.onRoomCollectionSnapshot);
    this.listenTo(this.roomCollection, 'change:favourite', this.onFavouriteChange);
    this.listenTo(this.roomCollection, 'remove', this.onRoomRemoved);
    this.listenTo(this.roomCollection, 'add', this.onRoomAdded);
    this.listenTo(this.roomCollection, 'reset', this.onRoomCollectionReset);

    this.listenTo(this, 'filter-complete', this.sort);

    this.listenTo(this, 'change:escalationTime', this.sort);

    this.listenTo(this, 'change:activity change:unreadItems change:mentions change:lastAccessTime', this.onRoomCriteriaChange);

    this.onRoomCollectionReset();
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


  filterDefault:   sortAndFilters.recents.filter,
  filterFavourite: sortAndFilters.favourites.filter,

  filterOneToOnes: function(model) {
    return one2oneFilter(model.attributes);
  },

  filterSearches: function() {
    return false;
  },

  filterOrgRooms: function(model) {
    var orgName = this.roomModel.get('selectedOrgName');
    return orgFilter(model.attributes, orgName);
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

  onRoomCollectionReset: function() {
    this.reset();
    this.roomCollection.filter(defaultCollectionFilter).forEach(function(model) {
      this.onRoomAdded(model);
    }, this);
  },

  getFilter: function (){
    return (this._filter || this.filterDefault);
  },

  // The criteria on the room model has changed.
  // Do we need to hide this item or not
  onRoomCriteriaChange: function(model) {
    // Only apply the filter if the model applies
    // to this collection.
    if (!this.modelApplies(model)) return;

    var filter = this._filter || this.filterDefault;
    model.set('isHidden', !filter(model));
    this.sort();
  },

  onRoomRemoved: function(model) {
    this.remove(model);
  },

  onFavouriteChange: function(model) {
    if(this.modelApplies(model)) {
      this.add(model);
    } else {
      this.remove(model);
    }

    this.setFilter();
  },

  onRoomAdded: function(model) {
    if(this.modelApplies(model)) {
      var filter = this.getFilter();
      model.set('isHidden', !filter(model));
      this.add(model);
    }
  },

  /* This is override in filtered-favourite-room-collection */
  modelApplies: function(model) {
    return !model.get('favourite');
  }

});

module.exports = FilteredRoomCollection;
