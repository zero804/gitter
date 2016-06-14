"use strict";

var Marionette = require('backbone.marionette');
var ItemView = require('./minibar-item-view');
var ItemModel = require('./minibar-item-model');
var HomeView = require('./home-view/home-view');
var SearchView = require('./search-view/search-view');
var PeopleView = require('./minibar-people-item-view');
var CloseView = require('./minibar-close-item-view');
var CollectionView = require('./minibar-collection-view');

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
      model: new ItemModel({ name: 'all', type: 'all' }),
    }));

    //We have to manually bind child events because of the Isomorphic Behaviour
    this.listenTo(homeView, 'minibar-item:activated', this.onHomeActivate, this);
    return homeView;
  },

  initSearch: function (optionsForRegion){
    var searchView = new SearchView(optionsForRegion({
      model: new ItemModel({ name: 'search', type: 'search' }),
    }));

    //We have to manually bind child events because of the Isomorphic Behaviour
    this.listenTo(searchView, 'minibar-item:activated', this.onSearchActivate, this);
    return searchView;
  },

  initPeople: function (optionsForRegion){
    var peopleView = new PeopleView(optionsForRegion({
      model: new ItemModel({ name: 'people', type: 'people' }),
    }));

    //We have to manually bind child events because of the Isomorphic Behaviour
    this.listenTo(peopleView, 'minibar-item:activated', this.onPeopleActivate, this);
    //FIXME, this throws an error, figure out why
    //return peopleView;
  },

  initCollection: function (optionsForRegion){
    var collectionView = new CollectionView(optionsForRegion({
      collection: this.collection,
      model: this.model,
      roomCollection: this.roomCollection,
      keyboardControllerView: this.keyboardControllerView,
    }));

    this.listenTo(collectionView, 'minibar-item:activated', this.onCollectionItemActivated, this);
    return collectionView;
  },

  initClose: function (optionsForRegion){
    var closeView = new CloseView(optionsForRegion({
      model: new ItemModel({ name: 'close', type: 'close' }),
      roomModel: this.model
    }));

    //We have to manually bind child events because of the Isomorphic Behaviour
    this.listenTo(closeView, 'minibar-item:close', this.onCloseClicked, this);
    return closeView;
  },

  childEvents: {
    'minibar-item:activated': 'onItemActivated',
  },

  initialize: function(attrs) {
    this.bus = attrs.bus;
    this.model = attrs.model;
    this.roomCollection = attrs.roomCollection;
    this.keyboardControllerView = attrs.keyboardControllerView;
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
    this.changeMenuState('org');
    this.model.set('selectedOrgName', model.get('name'));
  },

  changeMenuState: function(state){
    this.model.set({
      panelopenstate: true,
      state: state,
      profilemenuopenstate: false,
    });

  },

  onCloseClicked: function (){

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

});
