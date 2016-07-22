"use strict";

var assert = require('assert');
var Backbone = require('backbone');
var _ = require('underscore');
var KeyboardControllerView = require('public/js/views/menu/room/keyboard-controller/keyboard-controller-view');
var appEvents = require('utils/appevents');

describe.only('KeyboardControllerView', function(){

  var view;
  var model;
  var collection;
  beforeEach(function(){
    model = new Backbone.Model();
    model.minibarCollection = new Backbone.Collection([
      { type: 'org', name: 'troupe', id: 1 },
      { type: 'org', name: 'gitterHQ', id: 2 },
    ]);


    model.favouriteCollection = new Backbone.Collection([
      { uri: 'gitterHQ/test2' },
      { uri: 'troupe/test2' },
    ]);

    model.favouriteCollectionModel = new Backbone.Model({ active: true });

    model.primaryCollection = new Backbone.Collection([
      { uri: 'gitterHQ', active: true },
      { uri: 'gitterHQ/test1' },
      { uri: 'troupe' },
      { uri: 'troupe/test1' },
    ]);

    model.primaryCollectionModel = new Backbone.Model({ active: true });

    model.secondaryCollection = new Backbone.Collection([
      { uri: 'gitterHQ/all-rooms-1' },
      { uri: 'troupe/all-rooms-1' },
    ]);
    model.secondaryCollectionModel = new Backbone.Model({ active: true });

    model.tertiaryCollection = new Backbone.Collection([
      { uri: 'gitterHQ' },
      { uri: 'troupe' },
    ]);
    model.tertiaryCollectionModel = new Backbone.Model({ active: true });

    model.searchFocusModel = new Backbone.Model({ focus: false });

    collection = new Backbone.Collection([
      { type: 'org', name: 'gitterHQ' },
      { type: 'org', name: 'troupe' }
    ]);

    model.minibarHomeModel = new Backbone.Model({ type: 'all', name: 'all', active: true });
    model.minibarSearchModel = new Backbone.Model({ type: 'search', name: 'search' });
    model.minibarPeopleModel = new Backbone.Model({ type: 'people', name: 'people' });
    model.minibarCommunityCreateModel = new Backbone.Model({ name: 'Create Community', type: 'community-create' });
    model.minibarCloseModel = new Backbone.Model({ type: 'close', name: 'close' });
    model.minibarTempOrgModel = new Backbone.Model({ type: 'org', name: 'google', hidden: true});


    view = new KeyboardControllerView({
      model: model
    });
  });

  afterEach(function(){
    view.destroy();
  });

  describe('minibar switch hot keys', function(){
    it('should add `focus` to the "all" minibar model on room.1 event', function(){
      appEvents.trigger('keyboard.room.1');
      assert(model.minibarHomeModel.get('focus'));
    });

    it('should change the models state on room.1 event', function(){
      appEvents.trigger('keyboard.room.1');
      assert.equal(model.get('state'), 'all');
    });

    it('should change the models state but not focus on room.2 event', function(){
      appEvents.trigger('keyboard.room.2');
      assert.equal(model.get('state'), 'search');
      var focus = model.minibarCollection.findWhere({ focus: true });
      assert.equal(undefined, focus);
    });

    it('should add `focus` to the "people" minibar model on room.3 event', function(){
      appEvents.trigger('keyboard.room.3');
      assert(model.minibarPeopleModel.get('focus'));
    });

    it('should change the models state on room.3 event', function(){
      appEvents.trigger('keyboard.room.3');
      assert.equal(model.get('state'), 'people');
    });

    it('should select the right org item on a room event > 3', function(){
      appEvents.trigger('keyboard.room.4', { key: 4, code: 'Digit4' });
      assert(model.minibarCollection.at(0).get('focus'));
      appEvents.trigger('keyboard.room.5', { key: 5, code: 'Digit5' });
      assert(model.minibarCollection.at(1).get('focus'));
    });

    it('should set the correct org state and groupId on room event > 3', function(){
      appEvents.trigger('keyboard.room.4', { key: 4, code: 'Digit4' });
      assert.equal(model.get('state'), 'org');
      assert.equal(model.get('groupId'), 1);
      appEvents.trigger('keyboard.room.5', { key: 5, code: 'Digit5' });
      assert.equal(model.get('groupId'), 2);
    });

    it('should focus change menu state to search on cmd+s', function(){
      appEvents.trigger('keyboard.focus.search');
      assert.equal(model.get('state'), 'search');
    });

    it('should focus the active room item when nothing is in focus and left is pressed', function(){
      view.blurAllItems();
      appEvents.trigger('keyboard.room.prev');
      assert(model.primaryCollection.at(0).get('focus'));
    });

    it('should focus the minibarTempOrgIcon when it is not hidden and room.4 is pressed', function(){
      view.blurAllItems();
      model.minibarTempOrgModel.set('hidden', false);
      appEvents.trigger('keyboard.room.4', { key: 4, code: 'Digit4' });
      assert(model.minibarTempOrgModel.get('focus'));
    });

  });

  describe('arrow key movement', function(){
    it('it should focus the next minibar item when down is pressed', function(){
      appEvents.trigger('keyboard.room.4', { key: 4, code: 'Digit4' });
      appEvents.trigger('keyboard.room.down');
      assert(model.minibarCollection.at(1).get('focus'));
      assert.equal(model.minibarCollection.at(0).get('focus'), false);
    });

    it('it should focus the first minibar item when down is pressed and the last item is focused', function(){
      appEvents.trigger('keyboard.room.5', { key: 5, code: 'Digit5' });
      appEvents.trigger('keyboard.room.down');
      assert(model.minibarCloseModel.get('focus'));
      assert.equal(model.minibarCollection.at(1).get('focus'), false);
    });

    it('should change menu state after a short delay when the down arrow key is pressed', function(done){
      appEvents.trigger('keyboard.room.3');
      appEvents.trigger('keyboard.room.down');
      appEvents.trigger('keyboard.room.down');
      appEvents.trigger('keyboard.room.down');
      appEvents.trigger('keyboard.room.down');
      assert.equal(model.get('state'), 'people');
      setTimeout(function(){
        assert.equal(model.get('state'), 'all');
        done();
      }, 150);
    });

    it('it should focus the previous minibar item when up is pressed', function(){
      appEvents.trigger('keyboard.room.4', { key: 4, code: 'Digit4' });
      appEvents.trigger('keyboard.room.up');
      assert(model.minibarPeopleModel.get('focus'));
      assert.equal(model.minibarCollection.at(0).get('focus'), false);
    });

    it('it should focus the last minibar item when up is pressed and the first item is focused', function(){
      appEvents.trigger('keyboard.room.1');
      appEvents.trigger('keyboard.room.up');
      assert(model.minibarCloseModel.get('focus'));
      assert.equal(model.minibarCollection.at(0).get('focus'), false);
    });

    it('should change menu state after a short delay when the up arrow key is pressed', function(done){
      appEvents.trigger('keyboard.room.3');
      appEvents.trigger('keyboard.room.up');
      appEvents.trigger('keyboard.room.up');
      appEvents.trigger('keyboard.room.up');
      assert.equal(model.get('state'), 'people');
      setTimeout(function(){
        assert.equal(model.get('state'), 'close');
        done();
      }, 150);
    });

    it('should focus on the room list when right is pressed after the minibar is in focus', function(){
      //test with active in primary collection
      appEvents.trigger('keyboard.room.3');
      appEvents.trigger('keyboard.room.next');
      assert(model.primaryCollection.at(0).get('focus'));

      //reset and test with active in secondary
      model.primaryCollection.findWhere({ active: true }).set('active', false);
      model.secondaryCollection.at(0).set('active', true);
      appEvents.trigger('keyboard.room.3');
      appEvents.trigger('keyboard.room.next');
      assert(model.secondaryCollection.at(0).get('focus'));

      // reset and test with tertiary
      model.secondaryCollection.findWhere({ active: true }).set('active', false);
      model.tertiaryCollection.at(0).set('active', true);
      appEvents.trigger('keyboard.room.3');
      appEvents.trigger('keyboard.room.next');
      assert(model.tertiaryCollection.at(0).get('focus'));
    });

    it('should resepct the collection models active property when moving focus with the right key', function(){
      model.secondaryCollection.at(0).set('active', true);
      model.primaryCollectionModel.set('active', false);
      appEvents.trigger('keyboard.room.3');
      appEvents.trigger('keyboard.room.next');
      assert(model.secondaryCollection.at(0).get('focus'));

      model.tertiaryCollection.at(0).set('active', true);
      model.secondaryCollectionModel.set('active', false);
      appEvents.trigger('keyboard.room.3');
      appEvents.trigger('keyboard.room.next');
      assert(model.tertiaryCollection.at(0).get('focus'));
    });

    it('should move the focus downwards when the focus is on a room items', function(){
      view.blurAllItems();
      model.favouriteCollection.at(0).set('focus', true);
      appEvents.trigger('keyboard.room.down');
      assert(model.favouriteCollection.at(1).get('focus'));
    });

    it('should move from favourite to primary etc when pressing down', function(){
      view.blurAllItems();
      model.favouriteCollection.at(0).set('focus', true);
      appEvents.trigger('keyboard.room.down');
      appEvents.trigger('keyboard.room.down');
      assert(model.primaryCollection.at(0).get('focus'));
    });

    it('should wrap if at the end of the room collection', function(){
      view.blurAllItems();
      model.tertiaryCollection.at(1).set('focus', true);
      appEvents.trigger('keyboard.room.down');
      assert(model.favouriteCollection.at(0).get('focus'));
    });

    it('should move the focus upwards when the focus is on a room items', function(){
      view.blurAllItems();
      model.favouriteCollection.at(1).set('focus', true);
      appEvents.trigger('keyboard.room.up');
      assert(model.favouriteCollection.at(0).get('focus'));
    });

    it('should move from primary to favourite etc when pressing up', function(){
      view.blurAllItems();
      model.primaryCollection.at(0).set('focus', true);
      appEvents.trigger('keyboard.room.up');
      appEvents.trigger('keyboard.room.up');
      assert(model.favouriteCollection.at(0).get('focus'));
    });

    it('should wrap if at the end of the room collection', function(){
      view.blurAllItems();
      model.favouriteCollection.at(0).set('focus', true);
      appEvents.trigger('keyboard.room.up');
      assert(model.tertiaryCollection.at(1).get('focus'));
    });

    it('should move focus back to the active minibar item if the room list is in focus and left is presssed', function(){
      model.favouriteCollection.at(0).set('focus', true);
      model.minibarHomeModel.set('active', true);
      appEvents.trigger('keyboard.room.prev');
      assert(!view.getFocusedRoomItem());
      assert(model.minibarHomeModel.get('focus'));
    });

    it('should blur the search model when the down key is pressed', function(){
      model.searchFocusModel.set('focus', true);
      appEvents.trigger('keyboard.room.down');
      assert(!model.searchFocusModel.get('focus'));
    });

    it('should blur the search model when the up key is pressed', function(){
      model.searchFocusModel.set('focus', true);
      appEvents.trigger('keyboard.room.up');
      assert(!model.searchFocusModel.get('focus'));
    });

  });

  describe('tab key movement', function(){
    it('should move minibar focus when tab is pressed', function(){
      model.minibarCollection.at(0).set('focus', true);
      appEvents.trigger('keyboard.room.tab');
      assert(model.minibarCollection.at(1).get('focus'));
    });

    it('should move room list focus when tab is pressed', function(){
      view.blurAllItems();
      model.favouriteCollection.at(1).set('focus', true);
      appEvents.trigger('keyboard.room.tab');
      assert(model.primaryCollection.at(0).get('focus'));
    });

    it('should move focus to the room list if the last minibar item is in focus when tab is pressed', function(){
      model.minibarCloseModel.set('focus', true);
      appEvents.trigger('keyboard.room.tab');
      assert(!model.minibarCloseModel.get('focus'));
      assert(model.favouriteCollection.at(0).get('focus'));
    });

    it('should focus the first room-item when search is in focus', function(){
      view.blurAllItems();
      model.searchFocusModel.set('focus', true);
      appEvents.trigger('keyboard.room.tab');
      assert(model.favouriteCollection.at(0).get('focus'));
    });

    it('should move minibar focus backwards when shift-tab is pressed', function(){
      model.minibarCollection.at(1).set('focus', true);
      appEvents.trigger('keyboard.room.prev.tab');
      assert(model.minibarCollection.at(0).get('focus'));
    });

    it('should move room list focus backwards when shift-tab is pressed', function(){
      view.blurAllItems();
      model.primaryCollection.at(0).set('focus', true);
      appEvents.trigger('keyboard.room.prev.tab');
      assert(model.favouriteCollection.at(1).get('focus'));
    });

    it('should focus the last item in the minibar if the first room-item is in focus and shit-tab is pressed', function(){
      view.blurAllItems();
      model.favouriteCollection.at(0).set('focus', true);
      appEvents.trigger('keyboard.room.prev.tab');
      var index = (model.minibarCollection.length - 1);
      assert(model.minibarCollection.at(index).get('focus'));
    });

    it('should focus the close button after the last org item', function(){
      appEvents.trigger('keyboard.room.5', { key: 5, code: 'Digit5' });
      appEvents.trigger('keyboard.room.tab');
      assert(model.minibarCloseModel.get('focus'));
    });

    it('should focus on people if the first minibar org item is in focus and shit-tab is pressed', function(){
      appEvents.trigger('keyboard.room.4', { key: 4, code: 'Digit4' });
      assert(model.minibarCollection.at(0).get('focus'));
      appEvents.trigger('keyboard.room.prev.tab');
      assert(model.minibarPeopleModel.get('focus'));
    });

    it('should re-focus the search input when the first room item is selected in the search state and shift-tab os pressed', function(){
      model.set('state', 'search');
      view.blurAllItems();
      model.favouriteCollection.at(0).set('focus', true);
      appEvents.trigger('keyboard.room.prev.tab');
      assert(!model.favouriteCollection.at(0).get('focus'));
      assert(model.searchFocusModel.get('focus'));
    });

    it('should focus the active minibar item when search is in focus and shit-tab is pressed', function(){
      model.searchFocusModel.set('focus', true);
      appEvents.trigger('keyboard.room.prev.tab');
      assert(!model.searchFocusModel.get('focus'));
      assert(model.minibarHomeModel.get('focus'));
    });

    it('should not call preventDefault if the last item in the room list is in focus and tab is pressed', function(){
      var spy = function(){ assert(false, 'e.preventDefault was called'); };
      model.tertiaryCollection.at(1).set('focus', true);
      appEvents.trigger('keyboard.room.tab', { preventDefault: spy });
    });

    it('should not call preventDefault if the first minibar-item is in focus and shift-tab is pressed', function(){
      var spy = function(){ assert(false, 'e.preventDefault was called'); };
      model.minibarHomeModel.set('focus', true);
      appEvents.trigger('keyboard.room.prev.tab', { preventDefault: spy });
    });

  });

  describe('bluring items', function(){
    it('should blur the previously selected minibar item', function(){
      appEvents.trigger('keyboard.room.1');
      appEvents.trigger('keyboard.room.2');
      appEvents.trigger('keyboard.room.4', { key: 4, code: 'Digit4' });
      appEvents.trigger('keyboard.room.5', { key: 5, code: 'Digit5' });
      var items = model.minibarCollection.where({ focus: true });
      assert.equal(items.length, 1);
    });

    it('should blur every item that is in focus when blurAllItems is called', function(){
      //Focus all the things
      model.minibarCollection.at(0).set('focus', true);
      model.minibarCollection.at(1).set('focus', true);
      model.favouriteCollection.at(0).set('focus', true);
      model.favouriteCollection.at(1).set('focus', true);
      model.primaryCollection.at(0).set('focus', true);
      model.primaryCollection.at(1).set('focus', true);
      model.secondaryCollection.at(0).set('focus', true);
      model.secondaryCollection.at(1).set('focus', true);
      model.tertiaryCollection.at(0).set('focus', true);
      model.tertiaryCollection.at(1).set('focus', true);
      view.blurAllItems();
      assert.equal(model.minibarCollection.where({ focus: true }), 0);
      assert.equal(model.favouriteCollection.where({ focus: true }), 0);
      assert.equal(model.primaryCollection.where({ focus: true }), 0);
      assert.equal(model.secondaryCollection.where({ focus: true }), 0);
      assert.equal(model.tertiaryCollection.where({ focus: true }), 0);
    });

    it('should blur the minibarHomeModel', function(){
      model.minibarHomeModel.set('focus', true);
      view.blurAllItems();
      assert(!model.minibarHomeModel.get('focus'));
    });

    it('should blur the minibarPeopleModel', function(){
      model.minibarPeopleModel.set('focus', true);
      view.blurAllItems();
      assert(!model.minibarPeopleModel.get('focus'));
    });

    it('should blur the minibarSearchModel', function(){
      model.minibarSearchModel.set('focus', true);
      view.blurAllItems();
      assert(!model.minibarSearchModel.get('focus'));
    });

    it('should blur the minibarCloseModel', function(){
      model.minibarCloseModel.set('focus', true);
      view.blurAllItems();
      assert(!model.minibarCloseModel.get('focus'));
    });

  });

  describe('queryAttrOnRoomCollections', function(){
    it('should respect isHidden values', function(){
      model.primaryCollection.at(0).set({ active: true, isHidden: true });
      model.primaryCollection.at(1).set({ active: true });
      var result = view.queryAttrOnRoomCollections('active', true);
      assert.equal(result.get('uri'), 'gitterHQ/test1');
    });
  });

  describe('isMinibarInFocus', function(){
    it('should return true if the homeModel is in focus', function(){
      view.blurAllItems();
      model.minibarHomeModel.set('focus', true);
      assert(view.isMinibarInFocus());
    });

    it('should return true if the searchModel is in focus', function(){
      view.blurAllItems();
      model.minibarSearchModel.set('focus', true);
      assert(view.isMinibarInFocus());
    });

    it('should return true if the peopleModel is in focus', function(){
      view.blurAllItems();
      model.minibarPeopleModel.set('focus', true);
      assert(view.isMinibarInFocus());
    });

    it('should return true if the closeModel is in focus', function(){
      view.blurAllItems();
      model.minibarCloseModel.set('focus', true);
      assert(view.isMinibarInFocus());
    });

    it('should return true if a minibar collection item is in focus', function(){
      view.blurAllItems();
      model.minibarCollection.at(0).set('focus', true);
      assert(view.isMinibarInFocus());
    });

    it('should return true if the tempOrgItem is in focus', function(){
      view.blurAllItems();
      model.minibarTempOrgModel.set({ hidden: false, focus: true });
      assert(view.isMinibarInFocus());
    });

    it('should return false if the tempOrgItem is in focus but is hidden', function(){
      view.blurAllItems();
      model.minibarTempOrgModel.set({ hidden: true, focus: true });
      assert(!view.isMinibarInFocus());
    });

  });

  describe('getFlatMinibarCollection', function(){

    it('should place the homeMinibarItem at the 0 index', function(){
      assert.equal(view.getFlatMinibarCollection().indexOf(model.minibarHomeModel), 0);
    });

    it('should place the searchMinibarItem at the 1 index', function(){
      assert.equal(view.getFlatMinibarCollection().indexOf(model.minibarSearchModel), 1);
    });

    it('should place the peopleMinibarItem at the 2 index', function(){
      assert.equal(view.getFlatMinibarCollection().indexOf(model.minibarPeopleModel), 2);
    });

  });

});
