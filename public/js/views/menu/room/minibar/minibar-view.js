"use strict";

var Marionette = require('backbone.marionette');
var context = require('utils/context');
var appEvents = require('utils/appevents');
var HomeView = require('./home-view/home-view');
var SearchView = require('./search-view/search-view');
var PeopleView = require('./people-view/people-view');
var CloseView = require('./close-view/close-view');
var TempOrgView = require('./temp-org-view/temp-org-view');
var CollectionView = require('./minibar-collection-view');
var CommunityCreateView = require('./minibar-community-create-item-view');

require('views/behaviors/isomorphic');


module.exports = Marionette.LayoutView.extend({

  behaviors: function() {

    var behaviours = {
      Isomorphic: {
        home: { el: '#minibar-all', init: 'initHome' },
        search: { el: '#minibar-search', init: 'initSearch' },
        people: { el: '#minibar-people', init: 'initPeople' },
        collectionView: { el: '#minibar-collection', init: 'initCollection' },
        close: { el: '#minibar-close', init: 'initClose' },
        tempOrg: { el: '#minibar-temp', init: 'initTemp' }
      },
    };

    if(context.hasFeature('community-create')) {
      behaviours.Isomorphic.communityCreate = { el: '#minibar-community-create', init: 'initCommunityCreate' };
    }

    return behaviours;
  },

  initHome: function (optionsForRegion){
    var homeView = new HomeView(optionsForRegion({
      model: this.homeModel,
      roomMenuModel: this.model,
    }));

    //We have to manually bind child events because of the Isomorphic Behaviour
    this.listenTo(homeView, 'minibar-item:activated', this.onHomeActivate, this);
    return homeView;
  },

  initSearch: function (optionsForRegion){
    var searchView = new SearchView(optionsForRegion({
      model: this.searchModel,
      roomMenuModel: this.model,
    }));

    //We have to manually bind child events because of the Isomorphic Behaviour
    this.listenTo(searchView, 'minibar-item:activated', this.onSearchActivate, this);
    return searchView;
  },

  initPeople: function (optionsForRegion){
    var peopleView = new PeopleView(optionsForRegion({
      model: this.peopleModel,
      roomMenuModel: this.model,
    }));

    //We have to manually bind child events because of the Isomorphic Behaviour
    this.listenTo(peopleView, 'minibar-item:activated', this.onPeopleActivate, this);
    return peopleView;
  },

  initCollection: function (optionsForRegion){
    var collectionView = new CollectionView(optionsForRegion({
      collection: this.collection,
      roomMenuModel: this.model,
      keyboardControllerView: this.keyboardControllerView,
    }));

    this.listenTo(collectionView, 'minibar-item:activated', this.onCollectionItemActivated, this);
    return collectionView;
  },

  initCommunityCreate: function (optionsForRegion){
    var communityCreateView = new CommunityCreateView(optionsForRegion({
      model: this.communityCreateModel,
      roomMenuModel: this.model
    }));

    return communityCreateView;
  },

  initClose: function (optionsForRegion){
    var closeView = new CloseView(optionsForRegion({
      model: this.closeModel,
      roomMenuModel: this.model
    }));

    //We have to manually bind child events because of the Isomorphic Behaviour
    this.listenTo(closeView, 'minibar-item:close', this.onCloseClicked, this);
    return closeView;
  },

  initTemp: function (optionsForRegion){
    var tempView = new TempOrgView(optionsForRegion({
      model: this.tempModel,
      roomMenuModel: this.model,
      roomCollection: this.roomCollection,
      groupCollection: this.collection,
    }));

    this.listenTo(tempView, 'minibar-item:activated', this.onTempOrgItemClicked, this);
    return tempView;
  },

  modelEvents: {
    'change:state change:groupId': 'onMenuChangeState'
  },

  initialize: function(attrs) {
    this.bus = attrs.bus;
    this.model = attrs.model;
    this.roomCollection = attrs.roomCollection;
    this.homeModel = this.model.minibarHomeModel;
    this.searchModel = this.model.minibarSearchModel;
    this.peopleModel = this.model.minibarPeopleModel;
    this.communityCreateModel = this.model.minibarCommunityCreateModel;
    this.closeModel = this.model.minibarCloseModel;
    this.tempModel = this.model.minibarTempOrgModel;
    this.keyboardControllerView = attrs.keyboardControllerView;
    this.groupsCollection = attrs.groupsCollection;
    this.listenTo(this.bus, 'navigation', this.clearFocus, this);
    //When a snapshot comes back we need to re-set active/focus on the currently active element
    this.listenTo(this.collection, 'snapshot', this.onMenuChangeState, this);
    this.onMenuChangeState();
  },

  onHomeActivate: function (){
    this.changeMenuState('all');
  },

  onSearchActivate: function (){
    this.changeMenuState('search');
  },

  onPeopleActivate: function (){
    this.changeMenuState('people');
  },

  onCollectionItemActivated: function (view, model){
    this.model.set('groupId', model.get('id'));
    this.changeMenuState('org');
  },

  onTempOrgItemClicked: function (){
    var name = this.tempModel.get('name');
    this.model.set('tempGroupUri', name);
    this.changeMenuState('temp-org');
  },

  changeMenuState: function(state){
    appEvents.trigger('stats.event', 'minibar.activated.' + state);
    this.model.set({
      panelOpenState: true,
      state: state,
      profileMenuOpenState: false,
    });
  },


  onCloseClicked: function() {
    var newVal = !this.model.get('roomMenuIsPinned');
    var ANIMATION_TIME = 150;

    //if we are opening the panel
    if (newVal === true) {
      if (this.model.get('panelOpenState') === true) {
        this.model.set({ roomMenuIsPinned: newVal });
        this.bus.trigger('room-menu:pin', newVal);
      } else {
        // We stagger the trigger here so we don't jank the UI
        // resizing the the left-menu and main chat-frame
        setTimeout(function() {
          this.model.set({ roomMenuIsPinned: newVal });
          this.bus.trigger('room-menu:pin', newVal);
        }.bind(this), ANIMATION_TIME);
      }

      this.model.set({ panelOpenState: newVal });
    }

    //
    else {
      this.model.set({ roomMenuIsPinned: newVal });
      this.bus.trigger('room-menu:pin', newVal);
      // We stagger the trigger here so we don't jank the UI
      // resizing the the left-menu and main chat-frame
      setTimeout(function() {
        this.model.set({ panelOpenState: newVal });
      }.bind(this), ANIMATION_TIME);
    }

  },

  onMenuChangeState: function (){
    this.clearCurrentActiveElement();
    var state = this.model.get('state');
    switch(state) {
      case 'all':
        return this.homeModel.set({ active: true, focus: true });
      case 'search':
        return this.searchModel.set({ active: true, focus: true });
      case 'people':
        return this.peopleModel.set({ active: true, focus: true });
      case 'org':
        //FIXME -- test this works
        var groupId = this.model.get('groupId');
        var group = this.groupsCollection.get(groupId);
        var orgName = group.get('name');
        var model = this.collection.findWhere({ groupId: groupId });
        if(this.tempModel.get('name') === orgName) { model = this.tempModel; }
        if(!model) { return; }
        return model.set({ active: true, focus: true });
    }
  },

  clearCurrentActiveElement: function (){
    this.clearFocus();
    var activeModel = this.getActiveItem();
    if(activeModel) { activeModel.set('active', false); }
  },

  getActiveItem: function (){
    return this.homeModel.get('active') && this.homeModel ||
      this.searchModel.get('active') && this.searchModel ||
      this.peopleModel.get('active') && this.peopleModel ||
      this.tempModel.get('active') && this.tempModel ||
      this.collection.findWhere({ active: true }) ||
      this.communityCreateModel.get('active') && this.communityCreateModel ||
      this.closeModel.get('active') && this.closeModel;
  },

  clearFocus: function (){
    if(this.homeModel.get('focus')) { this.homeModel.set('focus', false); }
    if(this.searchModel.get('focus')) { this.searchModel.set('focus', false); }
    if(this.peopleModel.get('focus')) { this.peopleModel.set('focus', false); }
    if(this.communityCreateModel.get('focus')) { this.communityCreateModel.set('focus', false); }
    if(this.closeModel.get('focus')) { this.closeModel.set('focus', false); }
    if(this.tempModel.get('focus')) { this.tempModel.set('focus', false); }
    this.collection.where({ focus: true }).forEach(function(model){ model.set('focus', false); });
  },

});
