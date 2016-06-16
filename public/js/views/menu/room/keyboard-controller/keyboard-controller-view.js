'use strict';

var Marionette = require('backbone.marionette');
var _ = require('underscore');
var cocktail = require('cocktail');
var KeyboardEventMixin = require('views/keyboard-events-mixin');

var arrayBoundWrap = function(index, length) {
  return ((index % length) + length) % length;
};

var KeyboardController = Marionette.ItemView.extend({

  keyboardEvents: {
    'room.1': 'onMinibarAllSelected',
    'room.2': 'onMinibarSearchSelected',
    'room.3': 'onMinibarPeopleSelected',
    'room.4 room.5 room.6 room.7 room.8 room.9 room.10': 'onMinibarOrgSelected',
    'focus.search': 'onMinibarSearchSelected',
    'room.down': 'onDownKeyPressed',
    'room.up': 'onUpKeyPressed',
  },

  initialize: function(attrs) {
    this.minibarCollection = attrs.model.minibarCollection;
  },

  onMinibarAllSelected: function (){
    var allModel = this.minibarCollection.findWhere({ type: 'all' });
    allModel.set('focus', true);
    this.model.set('state', 'all');
  },

  onMinibarSearchSelected: function (){
    //the search input will focus itself
    this.model.set('state', 'search');
  },

  onMinibarPeopleSelected: function (){
    var peopleModel = this.minibarCollection.findWhere({ type: 'people' });
    peopleModel.set('focus', true);
    this.model.set('state', 'people');
  },

  onMinibarOrgSelected: function (e){
    var index = e.key;
    if(index === 0) { index = 10; } // 0 key triggers room.10
    index = index - 1; // Array 0 indexing at work
    var model = this.minibarCollection.at(index);
    model.set('focus', true);
    this.model.set({ state: 'org', selectedOrgName: model.get('name') });
  },

  onDownKeyPressed: function (){
    if(this.isMinibarFocused()) { this.moveMinibarFocus(1);}
  },

  onUpKeyPressed: function (){
    if(this.isMinibarFocused()) { this.moveMinibarFocus(-1);}
  },

  moveMinibarFocus: function (direction){
    var focusedMinibarItem = this.minibarCollection.findWhere({ focus: true });

    //blur current minibar item
    focusedMinibarItem.set('focus', false);

    //get next index
    var index = this.minibarCollection.indexOf(focusedMinibarItem);
    index = arrayBoundWrap(index + direction, this.minibarCollection.length);

    //focus next minibar element
    var activeMinibarItem = this.minibarCollection.at(index);
    activeMinibarItem.set('focus', true);

    //bail if the close item is focused
    if(activeMinibarItem.get('type') === 'close') { return; }

    //change the menu state
    return this.setDebouncedState(activeMinibarItem);
  },

  isMinibarFocused: function (){
    return !!this.minibarCollection.findWhere({ focus: true });
  },

  setDebouncedState: _.debounce(function (model){
    var type = model.get('type');
    if(type !== 'org') { return this.model.set('state', type); }
    this.model.set({ state: type, selectedOrgName: model.get('name') });
  }, 100),

});

cocktail.mixin(KeyboardController, KeyboardEventMixin);
module.exports = KeyboardController;
