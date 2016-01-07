'use strict';

var Backbone                 = require('backbone');
var _                        = require('underscore');
var ProxyCollection          = require('backbone-proxy-collection');
var store                    = require('components/local-store');
var RecentSearchesCollection = require('../collections/recent-searches');

var states = [
  'all',
  'search',
  'favourite',
  'people',
  'org',
];

var SEARCH_DEBOUNCE_INTERVAL = 100;

module.exports = Backbone.Model.extend({

  //TODO: Review these defaults once the pin
  //behaviour is finalised
  defaults: {
    state:                     '',
    searchTerm:                '',
    panelOpenState:            true,
    secondaryCollectionActive: false,
    secondaryCollectionHeader: '',
    roomMenuIsPinned:          true,
    selectedOrgName:           ''
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
    delete attrs.roomCollection;

    this._detailCollection  = (attrs.detailCollection || new Backbone.Collection());
    delete attrs.detailCollection;

    this.userModel          = attrs.userModel;
    delete attrs.userModel;

    //expose the public collection
    this.primaryCollection   = new ProxyCollection({ collection: this._roomCollection });
    this.searchTerms         = new RecentSearchesCollection();
    this.secondaryCollection = new ProxyCollection({ collection: this.searchTerms });

    this.listenTo(this.primaryCollection, 'snapshot', this.onPrimaryCollectionSnapshot, this);

    //TODO have added setState so this can be removed
    //tests must be migrated
    this.bus = attrs.bus;
    delete attrs.bus;

    this.listenTo(this.bus, 'room-menu:change:state', this.onStateChangeCalled, this);
    this.listenTo(this, 'change:searchTerm', this.onSearchTermChange, this);
    this.listenTo(this, 'change:state', this.onSwitchState, this);
    this.listenTo(this, 'change', this.save, this);
  },

  onStateChangeCalled: function(newState) {

    if (states.indexOf(newState) === -1) {
      throw new Error('Please only pass a valid state to roomMenuModel change state, you passed:' + newState);
    }

    this.trigger('change:state:pre', this.get('state'), newState);
    this.set('state', newState);
    this.trigger('change:state:post', this.get('state'));
  },

  //This may be redundant
  setState: function(type) {
    this.onStateChangeCalled(type);
  },

  onSwitchState: function(model, val) {/*jshint unused: true */
    //TODO these should prbably be moved into the secondary collection
    //jp 7/1/16
    switch (val) {
      case 'search':
        this.set({
          secondaryCollectionHeader: 'Recent Searches',
          secondaryCollectionActive: true,
        });
        break;
      case 'org':
        this.set({
          secondaryCollectionHeader: 'All Rooms',
          secondaryCollectionActive: true,
        });
        break;
      default:
        this.set('secondaryCollectionActive', false);
    }
  },

  onSearchTermChange: _.debounce(function() {
    this.searchTerms.add({ name: this.get('searchTerm') });
  }, SEARCH_DEBOUNCE_INTERVAL),

  onPrimaryCollectionSnapshot: function() {
    this.trigger('primary-collection:snapshot');
  },

  toJSON: function (){
    var attrs = this.attributes;
    return Object.keys(this.defaults).reduce(function(memo, key){
      memo[key] = attrs[key];
      return memo;
    }, {});
  },

  // TODO Should we be using cid here as the key?
  // JP 15/12/15
  sync: function(method, model, options) {//jshint unused: true
    var attrs;

    //save
    if (method === 'create' || method === 'update' || method === 'patch') {
      attrs = JSON.stringify(this);
      return store.set(this.cid, attrs);
    }

    //read
    attrs = store.get(this.cid);
    attrs = (attrs  || '{}');
    attrs = JSON.parse(attrs);
    // TODO Remove these overrides once the
    // menu state is persisted on the server
    // JP 15/12/15
    this.set(_.extend({}, attrs, {
      panelOpenState:   true,
      roomMenuIsPinned: true
    }));

    if(options.success) options.success();
  },

});
