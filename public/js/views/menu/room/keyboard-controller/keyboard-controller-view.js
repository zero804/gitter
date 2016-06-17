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

    //Minibar
    this.minibarCollection = attrs.model.minibarCollection;

    //Favourite
    this.favouriteCollection = attrs.model.favouriteCollection;
    this.favouriteCollectionModel = attrs.model.favouriteCollectionModel;

    //Primary
    this.primaryCollection = attrs.model.primaryCollection;
    this.primaryCollectionModel = attrs.model.primaryCollectionModel;

    //Secondary
    this.secondaryCollection = attrs.model.secondaryCollection;
    this.secondaryCollectionModel = attrs.model.secondaryCollectionModel;

    //Tertiary
    this.tertiaryCollection = attrs.model.tertiaryCollection;
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
    this.moveRoomCollectionFocus(1);
  },

  onUpKeyPressed: function (){
    if(this.isMinibarInFocus()) { return this.moveMinibarFocus(-1);}
    this.moveRoomCollectionFocus(-1);
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

  moveRoomCollectionFocus: function (direction){
    //get currently focussed OR active room element
    var activeRoomItem = this.getFocussedRoomItem() || this.getActiveRoomItem();
    //blur all currently focussed items
    this.blurAllItems();
    var roomCollection = this.getFlatRoomCollection();
    var index = roomCollection.indexOf(activeRoomItem);
    //if no room is currently focussed just focus the first one
    //this can happen, for example, if you are on home with no active room item
    //and you have just moved focus from the chat input
    index = (index === -1) ? 0 : arrayBoundWrap(index + direction, roomCollection.length);
    var nextActiveRoomItem = roomCollection[index];
    nextActiveRoomItem.set('focus', true);
  },

  focusActiveRoomItem: function (){
    this.blurAllItems();
    var activeRoomItem = this.getActiveRoomItem();
    if(!activeRoomItem) { return; }
    activeRoomItem.set('focus', true);
  },

  isMinibarInFocus: function (){
    return !!this.minibarCollection.findWhere({ focus: true });
  },

  getActiveRoomItem: function (){
    return this.queryAttrOnRoomCollections('active', true);
  },

  getFocussedRoomItem: function (){
    return this.queryAttrOnRoomCollections('focus', true);
  },

  queryAttrOnRoomCollections: function (attr, val){
    var q = {}; q[attr] = val;
    return this.favouriteCollectionModel.get('active') && this.favouriteCollection.findWhere(q) ||
      this.primaryCollectionModel.get('active') && this.primaryCollection.findWhere(q) ||
      this.secondaryCollectionModel.get('active') && this.secondaryCollection.findWhere(q) ||
      this.tertiaryCollectionModel.get('active') && this.tertiaryCollection.findWhere(q);
  },

  getFlatRoomCollection: function (){
    var rooms = [];
    function isHiddenFilter(model) { return !model.get('isHidden'); }

    //get filtered favourite rooms
    if(this.favouriteCollectionModel.get('active')) {
      rooms = rooms.concat(this.favouriteCollection.filter(isHiddenFilter));
    }

    //get filtered primary rooms
    if(this.primaryCollectionModel.get('active')) {
      rooms = rooms.concat(this.primaryCollection.filter(isHiddenFilter));
    }

    //get filtered secondary rooms
    if(this.secondaryCollectionModel.get('active')) {
      rooms = rooms.concat(this.secondaryCollection.filter(isHiddenFilter));
    }

    //get filtered tertiary rooms
    if(this.tertiaryCollectionModel.get('active')) {
      rooms = rooms.concat(this.tertiaryCollection.filter(isHiddenFilter));
    }

    return rooms;
  },

  setDebouncedState: _.debounce(function (model){
    var type = model.get('type');
    if(type !== 'org') { return this.model.set('state', type); }
    this.model.set({ state: type, selectedOrgName: model.get('name') });
  }, 100),

  blurAllItems: function (){
    function clearFocus(model){ model.set('focus', false); }
    this.minibarCollection.where({ focus: true }).forEach(clearFocus);
    this.favouriteCollection.where({ focus: true }).forEach(clearFocus);
    this.primaryCollection.where({ focus: true }).forEach(clearFocus);
    this.secondaryCollection.where({ focus: true }).forEach(clearFocus);
    this.tertiaryCollection.where({ focus: true }).forEach(clearFocus);

  },

});

cocktail.mixin(KeyboardController, KeyboardEventMixin);
module.exports = KeyboardController;
