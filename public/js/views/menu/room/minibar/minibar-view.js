"use strict";

var Marionette = require('backbone.marionette');
var ItemModel = require('./minibar-item-model');
var HomeView = require('./home-view/home-view');
var SearchView = require('./search-view/search-view');
var PeopleView = require('./people-view/people-view');
var CloseView = require('./close-view/close-view');
var CollectionView = require('./minibar-collection-view');
var CommunityCreateItemView = require('./minibar-community-create-item-view');
var domIndexById = require('../../../../utils/dom-index-by-id');
var fastdom = require('fastdom');
var appEvents = require('utils/appevents');


require('views/behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({

  behaviors: {
    Isomorphic: {
      home: { el: '#minibar-all', init: 'initHome' },
      search: { el: '#minibar-search', init: 'initSearch' },
      people: { el: '#minibar-people', init: 'initPeople' },
      collectionView: { el: '#minibar-collection', init: 'initCollection' },
      close: { el: '#minibar-close', init: 'initClose' },
    },
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
      model: this.model,
      keyboardControllerView: this.keyboardControllerView,
    }));

    this.listenTo(collectionView, 'minibar-item:activated', this.onCollectionItemActivated, this);
    return collectionView;
  },

  initClose: function (optionsForRegion){
    var closeView = new CloseView(optionsForRegion({
      model: this.closeModel,
      roomModel: this.model
    }));

    //We have to manually bind child events because of the Isomorphic Behaviour
    this.listenTo(closeView, 'minibar-item:close', this.onCloseClicked, this);
    return closeView;
  },

  modelEvents: {
    'change:state change:selectedOrgName': 'onMenuChangeState'
  },

  initialize: function(attrs) {
    this.bus = attrs.bus;
    this.model = attrs.model;
    this.homeModel = this.model.minibarHomeModel;
    this.searchModel = this.model.minibarSearchModel;
    this.peopleModel = this.model.minibarPeopleModel;
    this.closeModel = this.model.minibarCloseModel;
    this.keyboardControllerView = attrs.keyboardControllerView;
    this.listenTo(this.bus, 'navigation', this.clearFocus, this);
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
    appEvents.trigger('stats.event', 'minibar.activated.' + model.get('type'));
    this.model.set('selectedOrgName', model.get('name'));
    this.changeMenuState('org');
  },

  changeMenuState: function(state){
    this.model.set({
      panelopenstate: true,
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
        var orgName = this.model.get('selectedOrgName');
        var model = this.collection.findWhere({ name: orgName });
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
      this.collection.findWhere({ active: true }) ||
      this.closeModel.get('active') && this.closeModel;
  },

  clearFocus: function (){
    if(this.homeModel.get('focus')) { this.homeModel.set('focus', false); }
    if(this.searchModel.get('focus')) { this.searchModel.set('focus', false); }
    if(this.peopleModel.get('focus')) { this.peopleModel.set('focus', false); }
    if(this.closeModel.get('focus')) { this.closeModel.set('focus', false); }
    this.collection.where({ focus: true }).forEach(function(model){ model.set('focus', false); });
  },

});
