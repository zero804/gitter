"use strict";

var Marionette = require('backbone.marionette');
var ItemView = require('./minibar-item-view');
var ItemModel = require('./minibar-item-model');
var CloseView = require('./minibar-close-item-view');

require('views/behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({

  behaviors: {
    Isomorphic: {
      home: { el: '#minibar-all', init: 'initHome' },
      search: { el: '#minibar-search', init: 'initSearch' },
      people: { el: '#minibar-people', init: 'initPeople' },
      close: { el: '#minibar-close', init: 'initClose' },
    },
  },

  initHome: function (optionsForRegion){
    var homeView = new ItemView(optionsForRegion({
      model: new ItemModel({ name: 'all', type: 'all' }),
    }));

    //We have to manually bind child events because of the Isomorphic Behaviour
    this.listenTo(homeView, 'minibar-item:activated', this.onHomeActivate, this);
  },

  initSearch: function (optionsForRegion){
    var searchView = new ItemView(optionsForRegion({
      model: new ItemModel({ name: 'search', type: 'search' }),
    }));

    //We have to manually bind child events because of the Isomorphic Behaviour
    this.listenTo(searchView, 'minibar-item:activated', this.onSearchActivate, this);
  },

  initPeople: function (optionsForRegion){
    var peopleView = new ItemView(optionsForRegion({
      model: new ItemModel({ name: 'people', type: 'people' }),
    }));

    //We have to manually bind child events because of the Isomorphic Behaviour
    this.listenTo(peopleView, 'minibar-item:activated', this.onPeopleActivate, this);
  },

  initClose: function (optionsForRegion){
    var closeView = new CloseView(optionsForRegion({
      model: new ItemModel({ name: 'close', type: 'close' }),
      roomModel: this.model
    }));

    //We have to manually bind child events because of the Isomorphic Behaviour
    this.listenTo(closeView, 'minibar-item:close', this.onCloseClicked, this);
    closeView.render();
  },

  childEvents: {
    'minibar-item:activated': 'onItemActivated',
  },

  initialize: function(attrs) {
    this.bus = attrs.bus;
  },

  onHomeActivate: function (){
    this.model.set({
      panelOpenState: true,
      state: 'all',
      profileMenuOpenState: false,
    });
  },

  onSearchActivate: function (){
    this.model.set({
      panelOpenState: true,
      state: 'search',
      profileMenuOpenState: false,
    });
  },

  onPeopleActivate: function (){
    this.model.set({
      panelOpenState: true,
      state: 'people',
      profileMenuOpenState: false,
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
