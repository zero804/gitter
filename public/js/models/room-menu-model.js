'use strict';

var Backbone        = require('backbone');
var _               = require('underscore');
var ProxyCollection = require('backbone-proxy-collection');

var states = [
  'all',
  'search',
  'favourite',
  'people',
  'org',
];

var SEARCH_DEBOUNCE_INTERVAL = 100;

module.exports = Backbone.Model.extend({

  defaults:         {
    state:          'all',
    searchTerm:     '',
    panelOpenState: false,
  },

  initialize: function(attrs) {

    if (!attrs || !attrs.bus) {
      throw new Error('A valid message bus must be passed when creating a new RoomMenuModel');
    }

    if (!attrs || !attrs.roomCollection) {
      throw new Error('A valid room collection must be passed to a new RoomMenuModel');
    }

    if (!attrs || !attrs.userModel) {
      throw new Error('A valid user model must be passed to a new RoomMenuModel');
    }

    this.searchInterval = SEARCH_DEBOUNCE_INTERVAL;

    //assign internal collections
    this._roomCollection    = attrs.roomCollection;
    this._detailCollection  = (attrs.detailCollection || new Backbone.Collection());
    this.userModel          = attrs.userModel;

    //expose the public collection
    this.primaryCollection   = new ProxyCollection({ collection: this._roomCollection });
    this.secondaryCollection = new ProxyCollection({ collection: this._detailCollection });
    this.searchTerms         = new Backbone.Collection();

    this.listenTo(this.primaryCollection, 'snapshot', this.onPrimaryCollectionSnapshot, this);

    //TODO have added setState so this can be removed
    //tests must be migrated
    this.bus = attrs.bus;
    this.listenTo(this.bus, 'room-menu:change:state', this.onStateChangeCalled, this);

    this.listenTo(this, 'change:state', this.onStateChange, this);
    this.listenTo(this, 'change:searchTerm', this.onSearchTermChange, this);
  },

  onStateChangeCalled: function(newState) {

    if (states.indexOf(newState) === -1) {
      throw new Error('Please only pass a valid state to roomMenuModel change state');
    }

    this.trigger('change:state:pre', this.get('state'), newState);
    this.set('state', newState);
    this.trigger('change:state:post', this.get('state'));
  },

  setState: function(type) {
    this.onStateChangeCalled(type);
  },

  onSearchTermChange: _.debounce(function() {
    this.searchTerms.add({ term: this.get('searchTerm') });
  }, SEARCH_DEBOUNCE_INTERVAL),

  onPrimaryCollectionSnapshot: function() {
    this.trigger('primary-collection:snapshot');
  },

  onStateChange: function(self, state) { /*jshint unused: true */
    switch (state) {
      case 'search':
        this.generateSearchCollection();
        this.secondaryCollection.switchCollection(this.searchTerms);
        break;
      case 'favourite':
        this.generateFavourites();
        break;
      case 'people':
        this.generateOneToOnes();
        break;
      default:
        this.primaryCollection.switchCollection(this._roomCollection);
        break;
    }
  },

  generateSearchCollection: function() {
    this.primaryCollection.switchCollection(new Backbone.Collection());
  },

  generateFavourites: function() {
    var data = this._roomCollection.toJSON().filter(function(model) { return !!model.favourite});

    var collection = new Backbone.Collection(data);
    this.primaryCollection.switchCollection(collection);
  },

  generateOneToOnes: function() {
    var data = this._roomCollection.toJSON().filter(function(model) { return model.githubType === 'ONETOONE' });

    var collection = new Backbone.Collection(data);
    this.primaryCollection.switchCollection(collection);
  },

});
