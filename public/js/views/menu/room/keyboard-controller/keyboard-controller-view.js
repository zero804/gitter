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
    'room.next': 'onRightKeyPressed',
  },

  initialize: function(attrs) {
    this.minibarCollection = attrs.model.minibarCollection;
    this.primaryCollection = attrs.model.primaryCollection;
    this.secondaryCollection = attrs.model.secondaryCollection;
    this.tertiaryCollection = attrs.model.tertiaryCollection;
    this.primaryCollectionModel = attrs.model.primaryCollectionModel;
    this.secondaryCollectionModel = attrs.model.secondaryCollectionModel;
    this.tertiaryCollectionModel = attrs.model.tertiaryCollectionModel;
  },

  onMinibarAllSelected: function (){
    var allModel = this.minibarCollection.findWhere({ type: 'all' });
    this.blurAllItems();
    allModel.set('focus', true);
    this.model.set('state', 'all');
  },

  onMinibarSearchSelected: function (){
    //the search input will focus itself
    this.blurAllItems();
    this.model.set('state', 'search');
  },

  onMinibarPeopleSelected: function (){
    var peopleModel = this.minibarCollection.findWhere({ type: 'people' });
    this.blurAllItems();
    peopleModel.set('focus', true);
    this.model.set('state', 'people');
  },

  onMinibarOrgSelected: function (e){
    this.blurAllItems();
    var index = e.key;
    if(index === 0) { index = 10; } // 0 key triggers room.10
    index = index - 1; // Array 0 indexing at work
    var model = this.minibarCollection.at(index);
    model.set('focus', true);
    this.model.set({ state: 'org', selectedOrgName: model.get('name') });
  },

  onDownKeyPressed: function (){
    if(this.isMinibarInFocus()) { return this.moveMinibarFocus(1);}
  },

  onUpKeyPressed: function (){
    if(this.isMinibarInFocus()) { return this.moveMinibarFocus(-1);}
  },

  onRightKeyPressed: function (){
    if(this.isMinibarInFocus()) { return this.focusActiveRoomItem(); }
  },

  moveMinibarFocus: function (direction){
    var focusedMinibarItem = this.minibarCollection.findWhere({ focus: true });
    this.blurAllItems();

    //get next index
    var index = this.minibarCollection.indexOf(focusedMinibarItem);
    index = arrayBoundWrap(index + direction, this.minibarCollection.length);

    //focus next minibar element
    var activeMinibarItem = this.minibarCollection.at(index);
    activeMinibarItem.set('focus', true);

    //change the menu state
    return this.setDebouncedState(activeMinibarItem);
  },

  focusActiveRoomItem: function (){
    this.blurAllItems();
    var activeRoomItem = this.getActiveRoomItem();
    activeRoomItem.set('focus', true);
  },

  isMinibarInFocus: function (){
    return !!this.minibarCollection.findWhere({ focus: true });
  },

  getActiveRoomItem: function (){
    return this.primaryCollectionModel.get('active') && this.primaryCollection.findWhere({ active: true }) ||
      this.secondaryCollectionModel.get('active') && this.secondaryCollection.findWhere({ active: true }) ||
      this.tertiaryCollectionModel.get('active') && this.tertiaryCollection.findWhere({ active: true });
  },

  setDebouncedState: _.debounce(function (model){
    var type = model.get('type');
    if(type !== 'org') { return this.model.set('state', type); }
    this.model.set({ state: type, selectedOrgName: model.get('name') });
  }, 100),

  blurAllItems: function (){
    function clearFocus(model){ model.set('focus', false); }
    this.minibarCollection.where({ focus: true }).forEach(clearFocus);
    this.primaryCollection.where({ focus: true }).forEach(clearFocus);
    this.secondaryCollection.where({ focus: true }).forEach(clearFocus);
    this.tertiaryCollection.where({ focus: true }).forEach(clearFocus);

  },

});

cocktail.mixin(KeyboardController, KeyboardEventMixin);
module.exports = KeyboardController;
