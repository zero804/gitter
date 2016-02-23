'use strict';

var Backbone = require('backbone');
var BackboneFilteredCollection = require('filtered-collection');
var defaultFilter = require('gitter-web-shared/filters/left-menu-primary-default');

var FilteredRoomCollection = Backbone.FilteredCollection.extend({
  initialize: function(collection, options) {//jshint unused: true
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

    this.listenTo(this, 'sync', this.onSync, this);

    BackboneFilteredCollection.prototype.initialize.apply(this, arguments);
  },

  comparator: function(a, b) {
    var aMentions   = a.get('mentions');
    var bMentions   = b.get('mentions');
    if (aMentions) { return -1; }
    if (bMentions) { return 1; }

    var aUnread = !!a.get('unreadItems');
    var bUnread = !!b.get('unreadItems');

    if (aUnread) { return -1; }
    if (bUnread) { return 1;}

    var aLastAccess = a.get('lastAccessTime');
    var bLastAccess = b.get('lastAccessTime');

    if(!aLastAccess || !aLastAccess.valueOf) { return 1 }
    if(!bLastAccess || !bLastAccess.valueOf) { return -1 }

    return aLastAccess < bLastAccess ? 1 : -1;

  },

  onModelChangeState: function(model, val) {//jshint unused: true
    this.comparator = FilteredRoomCollection.prototype.comparator;
    switch (val) {
      case 'favourite' :
        this.setFilter(this.filterFavourite.bind(this));
        this.comparator = this.sortFavourites;
        break;
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
    this.sort();
  },

  onOrgNameChange: function() {
    this.setFilter();
  },

  filterFavourite: function(model) {
    return this.filterDefault(model) && !!model.get('favourite');
  },

  filterOneToOnes: function(model) {
    return this.filterDefault(model) && model.get('githubType') === 'ONETOONE';
  },

  filterSearches: function() {
    return false;
  },

  filterDefault: function (model){
    return defaultFilter(model.toJSON());
  },

  filterOrgRooms: function(model) {
    var orgName = this.roomModel.get('selectedOrgName');
    var name    = model.get('name').split('/')[0];
    return (name === orgName) && this.filterDefault(model) && !!model.get('roomMember');
  },

  onRoomCollectionSnapshot: function() {
    var args = Array.prototype.slice.call(arguments);
    this.trigger.apply(this, ['snapshot'].concat(args));
  },

  sortFavourites: function(a, b) {
    return (a.get('favourite') < b.get('favourite')) ? -1 : 1;
  },

  onSync: function() {
    if (this.comparator) { this.sort(); }
  },

});

module.exports = FilteredRoomCollection;
