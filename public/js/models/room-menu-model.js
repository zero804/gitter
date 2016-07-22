'use strict';

//TODO This has basically turned into a controller, refactor it JP 2/2/16

var Backbone = require('backbone');
var _ = require('underscore');
var ProxyCollection = require('backbone-proxy-collection');
var RecentSearchesCollection = require('../collections/recent-searches');
var SuggestedOrgCollection = require('../collections/org-suggested-rooms');
var apiClient = require('components/apiClient');
var context = require('utils/context');

var FilteredMinibarGroupCollection = require('../collections/filtered-minibar-group-collection');
var FilteredRoomCollection = require('../collections/filtered-room-collection');
var FilteredFavouriteRoomCollection = require('../collections/filtered-favourite-room-collection');
var SuggestedRoomsByRoomCollection = require('../collections/left-menu-suggested-by-room');
var UserSuggestions = require('../collections/user-suggested-rooms');
var SearchRoomPeopleCollection = require('../collections/left-menu-search-rooms-and-people');
var SearchChatMessages = require('../collections/search-chat-messages');

var FavouriteCollectionModel = require('../views/menu/room/favourite-collection/favourite-collection-model');
var PrimaryCollectionModel = require('../views/menu/room/primary-collection/primary-collection-model');
var SecondaryCollectionModel = require('../views/menu/room/secondary-collection/secondary-collection-model');
var TertiaryCollectionModel = require('../views/menu/room/tertiary-collection/tertiary-collection-model');
var favouriteCollectionFilter = require('gitter-web-shared/filters/left-menu-primary-favourite');
var MinibarItemModel = require('../views/menu/room/minibar/minibar-item-model');
var MinibarPeopleModel = require('../views/menu/room/minibar/people-view/people-model');
var MinibarTempOrgModel = require('../views/menu/room/minibar/temp-org-view/temp-org-model');

var getOrgNameFromUri = require('gitter-web-shared/get-org-name-from-uri');

var states = [
  'all',
  'search',
  'people',
  'org',
];

var SEARCH_DEBOUNCE_INTERVAL = 1000;

module.exports = Backbone.Model.extend({

  defaults: {
    state: '',
    searchTerm: '',
    roomMenuIsPinned: true,
    groupId: '',
    hasDismissedSuggestions: false,
  },

  constructor: function (attrs, options){

    var groupsCollection = attrs.groupsCollection;
    var activeGroup = groupsCollection.filter(function(group){
      return getOrgNameFromUri(group.uri) === attrs.selecedOrgName;
    }.bind(this))[0];
    if(activeGroup) {
      console.log('setting up a group id');
      attrs.groupId = activeGroup.get('id'); }

    Backbone.Model.prototype.constructor.call(this, attrs, options);
  },

  initialize: function(attrs) {

    this.set('panelOpenState', this.get('roomMenuIsPinned'));

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
    this._roomCollection = attrs.roomCollection;
    delete attrs.roomCollection;

    this._troupeModel = attrs.troupeModel;
    delete attrs.troupeModel;

    this.dndCtrl = attrs.dndCtrl;
    delete attrs.dndCtrl;

    this._orgCollection = attrs.orgCollection;

    this._detailCollection = (attrs.detailCollection || new Backbone.Collection());
    delete attrs.detailCollection;

    this.userModel = attrs.userModel;
    delete attrs.userModel;

    this.groupsCollection = attrs.groupsCollection;
    delete attrs.groupsCollection;

    //expose the public collection
    this.searchTerms = new RecentSearchesCollection(null);
    this.searchRoomAndPeople = new SearchRoomPeopleCollection(null, { roomMenuModel: this, roomCollection: this._roomCollection });
    this.searchMessageQueryModel = new Backbone.Model({ skip: 0 });
    this.searchChatMessages = new SearchChatMessages(null, { roomMenuModel: this, roomModel: this._troupeModel, queryModel: this.searchMessageQueryModel });
    this.suggestedOrgs = new SuggestedOrgCollection({ contextModel: this, roomCollection: this._roomCollection });
    this.userSuggestions = new UserSuggestions(null, { contextModel: context.user() });
    this._suggestedRoomCollection = new SuggestedRoomsByRoomCollection({
      roomMenuModel:           this,
      troupeModel:             this._troupeModel,
      roomCollection:          this._roomCollection,
      suggestedOrgsCollection: this.suggestedOrgs,
    });

    var orgsSnapshot = context.getSnapshot('groups') || [];
    var state = this.get('state');
    this.minibarHomeModel = new MinibarItemModel({ name: 'all', type: 'all', active: (state === 'all') });
    this.minibarSearchModel = new MinibarItemModel({ name: 'search', type: 'search', active: (state === 'search') });
    this.minibarPeopleModel = new MinibarPeopleModel({ active: (state === 'people')}, { roomCollection: this._roomCollection });
    this.minibarCommunityCreateModel = new MinibarItemModel({ name: 'Create Community', type: 'community-create' });
    this.minibarCloseModel = new MinibarItemModel({ name: 'close', type: 'close' });
    this.minibarTempOrgModel = new MinibarTempOrgModel(attrs.tempOrg, { troupe: context.troupe(), });

    var minibarModels = orgsSnapshot.map(function(model){
      return _.extend({}, model, { active: (state === 'org' && model.id === this.get('groupId')) });
    }.bind(this));

    this.groupsCollection.add(minibarModels);
    this.minibarCollection = new FilteredMinibarGroupCollection(null, {
      collection: this.groupsCollection
    });


    this.activeRoomCollection = new FilteredRoomCollection(null, {
      roomModel:  this,
      collection: this._roomCollection,
    });

    var favModels = this._roomCollection.filter(favouriteCollectionFilter);
    this.favouriteCollection = new FilteredFavouriteRoomCollection(favModels, {
      collection: this._roomCollection,
      roomModel:  this,
      dndCtrl:    this.dndCtrl,
    });

    this.favouriteCollectionModel = new FavouriteCollectionModel(null, {
      collection: this.favouriteCollection,
      roomMenuModel: this
    });

    this.primaryCollection = new ProxyCollection({ collection: this.activeRoomCollection });
    this.primaryCollectionModel = new PrimaryCollectionModel(null, {
      collection: this.primaryCollection,
      roomMenuModel: this
    });

    this.secondaryCollection = new ProxyCollection({ collection: this.searchTerms });
    this.secondaryCollectionModel = new SecondaryCollectionModel({}, {
      collection: this.secondaryCollection,
      roomMenuModel: this
    });

    this.tertiaryCollection = new ProxyCollection({ collection: this._orgCollection });
    this.tertiaryCollectionModel = new TertiaryCollectionModel({}, {
      collection: this.tertiaryCollection,
      roomMenuModel: this
    });

    this.searchFocusModel = new Backbone.Model({ focus: false });

    this.listenTo(this.primaryCollection, 'snapshot', this.onPrimaryCollectionSnapshot, this);
    this.snapshotTimeout = setTimeout(function(){
      this.onPrimaryCollectionSnapshot();
    }.bind(this), 1000);

    //TODO have added setState so this can be removed
    //tests must be migrated
    this.bus = attrs.bus;
    delete attrs.bus;

    this.listenTo(this, 'change:searchTerm', this.onSearchTermChange, this);
    this.listenTo(this, 'change:state', this.onSwitchState, this);
    this.listenTo(this, 'change', _.throttle(this.save.bind(this), 1500));
    this.listenTo(context.troupe(), 'change:id', this.onRoomChange, this);
    this.listenTo(this.bus, 'left-menu-menu-bar:activate', this.onMenuBarActivateRequest, this);
    this.onSwitchState(this, this.get('state'));
  },

  //custom set to limit states that can be assigned
  set: function (key, val){

    //FIXME -- REMOVE
    var isChangeingOrgName = (key === 'selectedOrgName') || (_.isObject(key) && !!key.selectedOrgName);
    if(isChangeingOrgName) {
      console.trace('CHANGING SELECTED ORG NAME', key.selectedOrgName || val);
    }

    var isChangingState = (key === 'state') || (_.isObject(key) && !!key.state);
    if(!isChangingState) { return Backbone.Model.prototype.set.apply(this, arguments); }
    var newState = _.isObject(key) ? key.state : val;
    //If we are changing the models state value
    if(states.indexOf(newState) === -1) { return; }
    return Backbone.Model.prototype.set.apply(this, arguments);
  },

  get: function (key){
    //FIXME --- REMOVE
    if(key === 'selectedOrgName') { console.trace('getting selected org name', this.attributes[key]); }
    return Backbone.Model.prototype.get.apply(this, arguments);
  },

  onSwitchState: function(model, val) {
    //TODO Test this JP 27/1/15
    var searchFocus = false;
    switch (val) {
      case 'all':
        this.primaryCollection.switchCollection(this.activeRoomCollection);
        this.secondaryCollection.switchCollection(this.userSuggestions);
        this.tertiaryCollection.switchCollection(this._orgCollection);
        break;

      case 'search':
        this.primaryCollection.switchCollection(this.searchRoomAndPeople);
        this.secondaryCollection.switchCollection(this.searchChatMessages);
        this.tertiaryCollection.switchCollection(this.searchTerms);
        searchFocus = true;
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

    this.trigger('change:state:post');
    this.searchFocusModel.set('focus', searchFocus);
  },

  onSearchTermChange: _.debounce(function() {
    this.searchTerms.add({ name: this.get('searchTerm') });
  }, SEARCH_DEBOUNCE_INTERVAL),

  onPrimaryCollectionSnapshot: function() {
    clearTimeout(this.snapshotTimeout);
    this.trigger('primary-collection:snapshot');
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
  sync: function(method, model, options) {
    var self = this;

    //save
    if (method === 'create' || method === 'update' || method === 'patch') {
      return apiClient.user.put('/settings/leftRoomMenu', this.toJSON(), {
        // No need to get the JSON back from the server...
        dataType: 'text'
      })
      .then(function() { if (options.success) options.success.apply(self, arguments); })
      .catch(function(err) { if (options.error) options.error(err); });
    }

    //The only time we need to fetch data is on page load
    //so we can just pull it our of the troupe context
    //JP 11/1/16
    this.set(context.getLeftRoomMenuContext());
    if (options.success) options.success();
  },

  onRoomChange: function (){
    var activeModel = this._getModel('active', true);
    var newlyActiveModel = this._getModel('id', context.troupe().get('id'));

    if(activeModel) { activeModel.set('active', false); }
    if(newlyActiveModel) { newlyActiveModel.set('active', true); }
    if(!this.get('roomMenuIsPinned')) { this.set('panelOpenState', false); }
  },

  onMenuBarActivateRequest: function(data) {
    data = data || {};
    var group = this.groupsCollection.findWhere({ name: data.groupName });
    this.set({
      panelOpenState: true,
      profileMenuOpenState: false,
      state: data.state,
      //FIXME -- test if this works && remove check
      groupId: !!group ? group.get('id') : '',
    });
  },

  getCurrentGroup: function (){
    if(this.get('state') !== 'org') { return false; }
    return this.groupsCollection.get(this.get('groupId'));
  },

  _getModel: function (prop, val){
    var query = {}; query[prop] = val;
    return this.primaryCollection.findWhere(query) ||
      this.secondaryCollection.findWhere(query) ||
        this.tertiaryCollection.findWhere(query) ||
          this._roomCollection.findWhere(query);
  },

});
