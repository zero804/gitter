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
    secondaryCollectionActive: false,
    secondaryCollectionHeader: ''
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


    this.listenTo(this, 'change:searchTerm', this.onSearchTermChange, this);
    this.listenTo(this, 'change:state', this.onSwitchState, this);
  },

  onStateChangeCalled: function(newState) {

    if (states.indexOf(newState) === -1) {
      throw new Error('Please only pass a valid state to roomMenuModel change state, you passed:' + newState);
    }

    this.trigger('change:state:pre', this.get('state'), newState);
    this.set('state', newState);
    this.trigger('change:state:post', this.get('state'));
  },

  setState: function(type) {
    this.onStateChangeCalled(type);
  },

  onSwitchState: function (model, val){/*jshint unused: true */
    switch(val) {
      case 'search':
        this.set({
          secondaryCollectionHeader: 'Recent Searches',
          secondaryCollectionActive: true
        });
        break;
      case 'org':
        this.set({
          secondaryCollectionHeader: 'All Rooms',
          secondaryCollectionActive: true
        });
        break;
      default:
        this.set('secondaryCollectionActive', false);
    }
  },

  onSearchTermChange: _.debounce(function() {
    this.searchTerms.add({ term: this.get('searchTerm') });
  }, SEARCH_DEBOUNCE_INTERVAL),

  onPrimaryCollectionSnapshot: function() {
    this.trigger('primary-collection:snapshot');
  },

});
