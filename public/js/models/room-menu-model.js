'use strict';

//TODO This has basically turned into a controller, refactor it JP 2/2/16

var Backbone                       = require('backbone');
var _                              = require('underscore');
var ProxyCollection                = require('backbone-proxy-collection');
var RecentSearchesCollection       = require('../collections/recent-searches');
var SuggestedOrgCollection         = require('../collections/org-suggested-rooms');
var apiClient                      = require('components/apiClient');
var FilteredRoomCollection         = require('../collections/filtered-room-collection.js');
var SuggestedRoomsByRoomCollection = require('../collections/left-menu-suggested-by-room');
var SearchRoomPeopleCollection     = require('../collections/left-menu-search-rooms-and-people');
var SearchChatMessages             = require('../collections/search-chat-messages');
var perfTiming                     = require('components/perf-timing');

var states = [
  'all',
  'search',
  'favourite',
  'people',
  'org',
];

var SEARCH_DEBOUNCE_INTERVAL = 1000;

module.exports = Backbone.Model.extend({

  //TODO: Review these defaults once the pin
  //behaviour is finalised
  defaults: {
    state:                     '',
    searchTerm:                '',
    panelOpenState:            true,
    roomMenuIsPinned:          true,
    selectedOrgName:           '',
  },

  constructor: function (attrs, options){
    attrs = _.extend(attrs, window.troupeContext.leftRoomMenuState);
    Backbone.Model.prototype.constructor.call(this, attrs, options);
  },

  //TODO Remove all these delete statements and pass the object with the options hash
  //not the attrs
  //JP 27/1/16
  initialize: function(attrs) {

    perfTiming.start('left-menu-init');

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
    this._roomCollection          = attrs.roomCollection;
    delete attrs.roomCollection;

    this._troupeModel = attrs.troupeModel;
    delete attrs.troupeModel;


    //TODO TEST THIS & THROW ERROR JP 25/1/16
    this._orgCollection = attrs.orgCollection;

    this._detailCollection = (attrs.detailCollection || new Backbone.Collection());
    delete attrs.detailCollection;

    this.userModel = attrs.userModel;
    delete attrs.userModel;

    //expose the public collection
    this.searchTerms              = new RecentSearchesCollection(null);
    this.searchRoomAndPeople      = new SearchRoomPeopleCollection(null, { roomMenuModel: this });
    this.searchChatMessages       = new SearchChatMessages(null, { roomMenuModel: this, roomModel: this._troupeModel });
    this.suggestedOrgs            = new SuggestedOrgCollection([], { contextModel: this, roomCollection: this._roomCollection });
    this._suggestedRoomCollection = new SuggestedRoomsByRoomCollection(null, {
      roomMenuModel:           this,
      troupeModel:             this._troupeModel,
      roomCollection:          this._roomCollection,
      suggestedOrgsCollection: this.suggestedOrgs,
    });


    this.activeRoomCollection   = new FilteredRoomCollection(null, {
      roomModel:  this,
      collection: this._roomCollection,
    });

    this.primaryCollection   = new ProxyCollection({ collection: this.activeRoomCollection });
    this.secondaryCollection = new ProxyCollection({ collection: this.searchTerms });
    this.tertiaryCollection  = new ProxyCollection({ collection: this._orgCollection });

    this.listenTo(this.primaryCollection, 'snapshot', this.onPrimaryCollectionSnapshot, this);
    this.snapshotTimeout = setTimeout(function(){
      this.onPrimaryCollectionSnapshot();
    }.bind(this), 1000);

    //TODO have added setState so this can be removed
    //tests must be migrated
    this.bus = attrs.bus;
    delete attrs.bus;

    this.listenTo(this.bus, 'room-menu:change:state', this.onStateChangeCalled, this);
    this.listenTo(this, 'change:searchTerm', this.onSearchTermChange, this);
    this.listenTo(this, 'change:state', this.onSwitchState, this);
    this.listenTo(this, 'change', _.debounce(this.save.bind(this), 500));
  },

  onStateChangeCalled: function(newState) {

    if (states.indexOf(newState) === -1) {
      throw new Error('Please only pass a valid state to roomMenuModel change state, you passed:' + newState);
    }


    perfTiming.start('left-menu-change');
    this.trigger('change:state:pre', this.get('state'), newState);
    this.set('state', newState);
    this.trigger('change:state:post', this.get('state'));
    perfTiming.end('left-menu-change');
  },

  //This may be redundant
  setState: function(type) {
    this.onStateChangeCalled(type);
  },

  onSwitchState: function(model, val) {/*jshint unused: true */

    //TODO Test this JP 27/1/15
    switch (val) {
      case 'all':
        this.primaryCollection.switchCollection(this.activeRoomCollection);
        this.secondaryCollection.switchCollection(this._suggestedRoomCollection);
        this.tertiaryCollection.switchCollection(this._orgCollection);
        break;

      case 'search':
        this.primaryCollection.switchCollection(this.searchRoomAndPeople);
        this.secondaryCollection.switchCollection(this.searchChatMessages);
        this.tertiaryCollection.switchCollection(this.searchTerms);
        break;

      case 'favourite':
        this.primaryCollection.switchCollection(this.activeRoomCollection);
        this.secondaryCollection.switchCollection(this._suggestedRoomCollection);
        break;

      case 'org':
        this.primaryCollection.switchCollection(this.activeRoomCollection);
        this.secondaryCollection.switchCollection(this.suggestedOrgs);
        this.tertiaryCollection.switchCollection(this._suggestedRoomCollection);
        break;

      default:
        this.primaryCollection.switchCollection(this.activeRoomCollection);
        this.secondaryCollection.switchCollection(new Backbone.Collection(null));
        this.tertiaryCollection.switchCollection(new Backbone.Collection(null));
        break;
    }
  },

  onSearchTermChange: _.debounce(function() {
    this.searchTerms.add({ name: this.get('searchTerm') });
  }, SEARCH_DEBOUNCE_INTERVAL),

  onPrimaryCollectionSnapshot: function() {
    clearTimeout(this.snapshotTimeout);
    this.trigger('primary-collection:snapshot');
    this.trigger('change:state', this, this.get('state'));
  },

  toJSON: function() {
    var attrs = this.attributes;

    //only ever store the defaults everything else is determined at run-time
    return Object.keys(this.defaults).reduce(function(memo, key) {
      if (key === 'searchTerm') return memo;
      memo[key] = attrs[key];
      return memo;
    }, {});
  },

  //This can be changed to userPreferences once the data is maintained
  //JP 8/1/16
  sync: function(method, model, options) {//jshint unused: true
    var self = this;
    var attrs;

    //save
    if (method === 'create' || method === 'update' || method === 'patch') {
      attrs = JSON.stringify(this);
      return apiClient.user.put('/settings/leftRoomMenu', this.toJSON())
        .then(function() { if (options.success) options.success.apply(self, arguments); })
        .catch(function(err) { if (options.error) options.error(err); });
    }

    //if we are in a mobile environment then the menu will never be pinned
    if (this.get('isMobile')) {
      window.troupeContext = {
        leftRoomMenuState: {
          roomMenuIsPinned: false,
          panelOpenState:   false,
        },
      };
    }

    //The only time we need to fetch data is on page load
    //so we can just pull it our of the troupe context
    //JP 11/1/16
    this.set(window.troupeContext.leftRoomMenuState);
    if (options.success) options.success();
  },

});
