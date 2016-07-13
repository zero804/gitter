'use strict';

var Marionette = require('backbone.marionette');
var _ = require('underscore');
var cocktail = require('cocktail');
var context = require('utils/context');
var KeyboardEventMixin = require('views/keyboard-events-mixin');

var arrayBoundWrap = function(index, length) {
  return ((index % length) + length) % length;
};

var isHiddenFilter = function (model) { return !model.get('isHidden'); };

var KeyboardController = Marionette.ItemView.extend({

  keyboardEvents: {
    'room.1': 'onMinibarAllSelected',
    'room.2': 'onMinibarSearchSelected',
    'room.3': 'onMinibarPeopleSelected',
    'room.4': 'onMinibarTempSelected',
    'room.5 room.6 room.7 room.8 room.9 room.10': 'onMinibarOrgSelected',
    'focus.search': 'onMinibarSearchSelected',
    'room.down': 'onDownKeyPressed',
    'room.up': 'onUpKeyPressed',
    'room.next': 'onRightKeyPressed',
    'room.prev': 'onLeftKeyPressed',
    'room.tab': 'onTabKeyPressed',
    'room.prev.tab': 'onTabShiftKeyPressed',
  },

  initialize: function(attrs) {

    //Minibar
    this.minibarCollection = attrs.model.minibarCollection;
    this.minibarHomeModel = attrs.model.minibarHomeModel;
    this.minibarSearchModel = attrs.model.minibarSearchModel;
    this.minibarPeopleModel = attrs.model.minibarPeopleModel;
    this.minibarCommunityCreateModel = attrs.model.minibarCommunityCreateModel;
    this.minibarCloseModel = attrs.model.minibarCloseModel;
    this.minibarTempOrgModel = attrs.model.minibarTempOrgModel;

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

    //manage search focus
    this.searchFocusModel = attrs.model.searchFocusModel;
  },

  onMinibarAllSelected: function (){
    this.blurAllItems();
    this.minibarHomeModel.set('focus', true);
    this.setModelState('all');
  },

  onMinibarSearchSelected: function (){
    //the search input will focus itself
    this.blurAllItems();
    this.setModelState('search');
  },

  onMinibarPeopleSelected: function (){
    this.blurAllItems();
    this.minibarPeopleModel.set('focus', true);
    this.setModelState('people');
  },

  onMinibarTempSelected: function (e){
    this.blurAllItems();
    if(!this.minibarTempOrgModel.get('hidden')) {
      return this.minibarTempOrgModel.set('focus', true);
    }
    return this.onMinibarOrgSelected(e);
  },

  onMinibarOrgSelected: function (e){
    this.blurAllItems();
    var index = e.key;
    if(index === 0) { index = 10; } // 0 key triggers room.10
    // we have room.1 ~ room.3 triggering home/search/people so we have to account for that with indexing here
    index = index - 4;
    index = arrayBoundWrap(index, this.minibarCollection.length);
    var model = this.minibarCollection.at(index);
    model.set('focus', true);
    this.setModelState({ state: 'org', selectedOrgName: model.get('name') });
  },

  onDownKeyPressed: function (e){
    this.searchFocusModel.set('focus', false);
    if(this.isMinibarInFocus()) { return this.moveMinibarFocus(1);}
    this.moveRoomCollectionFocus(1);
  },

  onUpKeyPressed: function (){
    this.searchFocusModel.set('focus', false);
    if(this.isMinibarInFocus()) { return this.moveMinibarFocus(-1);}
    this.moveRoomCollectionFocus(-1);
  },

  onRightKeyPressed: function (){
    this.searchFocusModel.set('focus', false);
    if(this.isMinibarInFocus()) { return this.focusActiveRoomItem(); }
  },

  onLeftKeyPressed: function (){
    this.searchFocusModel.set('focus', false);
    if(!this.isMinibarInFocus()) {
      if(this.isRoomListInFocus()) { return this.focusActiveMinibarItem(); }
      return this.focusActiveRoomItem();
    }
  },

  onTabKeyPressed: function (e){
    var index;

    var activeRoomItem = this.queryAttrOnRoomCollections('focus', true);
    var roomList = this.getFlatRoomCollection();
    //If the last room-item in the list is in focus bail out
    if(roomList.indexOf(activeRoomItem) === (roomList.length - 1)) { return; }

    if(e) { e.preventDefault(); }

    //When search is in focus and you press tab move to the first item in the room list
    if(this.searchFocusModel.get('focus')) {
      this.searchFocusModel.set('focus', false);
      return this.focusFirstRoomItem();
    }

    if(this.isMinibarInFocus()) {
      var activeMinibarItem = this.queryAttrOnMinibar('focus', true);
      var collection = this.getFlatMinibarCollection();
      index = collection.indexOf(activeMinibarItem);
      //If the last item in the minibar collection has focus
      if(index === (collection.length - 1)) { return this.focusFirstRoomItem(); }
      return this.moveMinibarFocus(1);
    }
    index = roomList.indexOf(activeRoomItem);
    if(index === (roomList.length - 1)) { return this.focusFirstMinibarItem(); }
    return this.moveRoomCollectionFocus(1);
  },

  onTabShiftKeyPressed: function (e){
    var index;

    var isMinibarInFocus = this.isMinibarInFocus();
    if(this.minibarHomeModel.get('focus')) { return; }
    if(e) { e.preventDefault(); }

    if(this.searchFocusModel.get('focus')){
      this.searchFocusModel.set('focus', false);
      return this.focusActiveMinibarItem();
    }

    //unfocus search
    this.searchFocusModel.set('focus', false);
    //when the minibar is in focus
    if(isMinibarInFocus) {
      var focusedMinibarItem = this.getFocusedMinibarItem();
      var collection = this.getFlatMinibarCollection();
      index = collection.indexOf(focusedMinibarItem);
      if(index === 0) { return this.focusLastRoomItem(); }
      return this.moveMinibarFocus(-1);
    }

    var focusedRoomItem = this.getFocusedRoomItem();
    var roomList = this.getFlatRoomCollection();
    index = roomList.indexOf(focusedRoomItem);
    if(index !== 0) { return this.moveRoomCollectionFocus(-1);}
    //If we are in the search state me may have to move focus back to search
    if(this.model.get('state') === 'search') { return this.focusSearch(); }
    return this.focusLastMinibarItem();
  },

  setModelState: function (attrs){
    if(_.isString(attrs)) { attrs = { state: attrs }; }
    this.model.set(_.extend({}, attrs, {
      panelOpenState: true
    }));
  },

  moveMinibarFocus: function (direction){
    var focusedMinibarItem = this.queryAttrOnMinibar('focus', true);
    this.blurAllItems();

    //get next index
    var collection = this.getFlatMinibarCollection();
    var index = collection.indexOf(focusedMinibarItem);
    index = arrayBoundWrap(index + direction, collection.length);

    //focus next minibar element
    var activeMinibarItem = collection[index];
    activeMinibarItem.set('focus', true);

    //change the menu state
    return this.setDebouncedState(activeMinibarItem);
  },

  moveRoomCollectionFocus: function (direction){
    //get currently Focused OR active room element
    var activeRoomItem = this.getFocusedRoomItem() || this.getActiveRoomItem();
    //blur all currently Focused items
    this.blurAllItems();
    var roomCollection = this.getFlatRoomCollection();
    var index = roomCollection.indexOf(activeRoomItem);
    //if no room is currently Focused just focus the first one
    //this can happen, for example, if you are on home with no active room item
    //and you have just moved focus from the chat input
    index = (index === -1) ? 0 : arrayBoundWrap(index + direction, roomCollection.length);
    var nextActiveRoomItem = roomCollection[index];
    //We can, in the case of the people state for example, have an empty room list
    //so we guard here to avoid a runtime error
    if(!nextActiveRoomItem) { return; }
    nextActiveRoomItem.set('focus', true);
  },

  focusActiveRoomItem: function (){
    this.blurAllItems();
    var activeRoomItem = this.getActiveRoomItem();
    if(!activeRoomItem) { activeRoomItem = this.getFlatRoomCollection()[0]; }
    if(!activeRoomItem) { return; }
    activeRoomItem.set('focus', true);
  },

  focusActiveMinibarItem: function (){
    this.blurAllItems();
    var activeMinibarItem = this.getActiveMinibarItem();
    activeMinibarItem.set('focus', true);
  },

  focusFirstRoomItem: function (){
    this.blurAllItems();
    var roomList = this.getFlatRoomCollection();
    roomList[0].set('focus', true);
  },

  focusLastRoomItem: function (){
    this.blurAllItems();
    var roomList = this.getFlatRoomCollection();
    var index = roomList.length - 1;
    roomList[index].set('focus', true);
  },

  focusLastMinibarItem: function (){
    this.blurAllItems();
    var index = (this.minibarCollection.length - 1);
    var lastMinibarItem = this.minibarCollection.at(index);
    lastMinibarItem.set('focus', true);
  },

  focusFirstMinibarItem: function (){
    this.blurAllItems();
    this.minibarCollection.at(0).set('focus', true);
  },

  focusSearch: function (){
    this.blurAllItems();
    this.searchFocusModel.set('focus', true);
  },

  isMinibarInFocus: function (){
    return !!this.getFocusedMinibarItem();
  },

  isRoomListInFocus: function (){
    return !!this.getFocusedRoomItem();
  },

  getActiveMinibarItem: function (){
    return this.queryAttrOnMinibar('active', true);
  },

  getFocusedMinibarItem: function (){
    return this.queryAttrOnMinibar('focus', true);
  },

  getActiveRoomItem: function (){
    return this.queryAttrOnRoomCollections('active', true);
  },

  getFocusedRoomItem: function (){
    return this.queryAttrOnRoomCollections('focus', true);
  },

  queryAttrOnRoomCollections: function (attr, val){
    var filterFunc = function(model){ return model.get(attr) === val; };
    return this.favouriteCollectionModel.get('active') && this.favouriteCollection.filter(isHiddenFilter).filter(filterFunc)[0] ||
      this.primaryCollectionModel.get('active') && this.primaryCollection.filter(isHiddenFilter).filter(filterFunc)[0] ||
        this.secondaryCollectionModel.get('active') && this.secondaryCollection.filter(isHiddenFilter).filter(filterFunc)[0] ||
          this.tertiaryCollectionModel.get('active') && this.tertiaryCollection.filter(isHiddenFilter).filter(filterFunc)[0];
  },

  queryAttrOnMinibar: function (attr, val){
    var q = {}; q[attr] = val;
    return  (this.minibarHomeModel.get(attr) === val) && this.minibarHomeModel ||
      (this.minibarSearchModel.get(attr) === val) && this.minibarSearchModel ||
      (this.minibarPeopleModel.get(attr) === val) && this.minibarPeopleModel ||
      (!this.minibarTempOrgModel.get('hidden') && this.minibarTempOrgModel.get(attr) === val && this.minibarTempOrgModel) ||
      this.minibarCollection.findWhere(q) ||
      (context.hasFeature('community-create') && this.minibarCommunityCreateModel.get(attr) === val) && this.minibarCommunityCreateModel ||
      (this.minibarCloseModel.get(attr) === val) && this.minibarCloseModel;
  },

  getFlatRoomCollection: function (){
    var rooms = [];

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

  getFlatMinibarCollection: function (){
    var collection = [ this.minibarHomeModel, this.minibarSearchModel, this.minibarPeopleModel ];

    if(!this.minibarTempOrgModel.get('hidden')) {
      collection = collection.concat([ this.minibarTempOrgModel ]);
    }

    collection = collection.concat(this.minibarCollection.models);

    if(context.hasFeature('community-create')) {
      collection = collection.concat([ this.minibarCommunityCreateModel ]);
    }
    collection = collection.concat([ this.minibarCloseModel ]);
    return collection;
  },

  setDebouncedState: _.debounce(function (model){
    var type = model.get('type');
    this.setModelState({
      state: type,
      selectedOrgName: (type === 'org') ? model.get('name') : null,
    });
  }, 100),

  blurAllItems: function (){
    function clearFocus(model){ model.set('focus', false); }
    this.getFlatRoomCollection().forEach(clearFocus);
    this.getFlatMinibarCollection().forEach(clearFocus);
  },

});

cocktail.mixin(KeyboardController, KeyboardEventMixin);
module.exports = KeyboardController;
