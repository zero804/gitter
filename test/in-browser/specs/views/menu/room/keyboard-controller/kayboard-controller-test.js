"use strict";

var assert = require('assert');
var Backbone = require('backbone');
var _ = require('underscore');
var KeyboardControllerView = require('public/js/views/menu/room/keyboard-controller/keyboard-controller-view');
var appEvents = require('utils/appevents');

describe.only('KeyboardControllerView', function(){

  var view;
  var model;
  beforeEach(function(){
    model = new Backbone.Model();
    model.minibarCollection = new Backbone.Collection([
      { type: 'all', name: 'all', active: true },
      { type: 'search', name: 'search' },
      { type: 'people', name: 'people' },
      { type: 'org', name: 'troupe' },
      { type: 'org', name: 'gitterHQ' },
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
      var allModel = model.minibarCollection.findWhere({ focus: true });
      assert.equal(allModel.get('name'), 'all');
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
      var peopleModel = model.minibarCollection.findWhere({ focus: true });
      assert.equal(peopleModel.get('name'), 'people');
    });

    it('should change the models state on room.3 event', function(){
      appEvents.trigger('keyboard.room.3');
      assert.equal(model.get('state'), 'people');
    });

    it('should select the right org item on a room event > 3', function(){
      appEvents.trigger('keyboard.room.4', { key: 4 });
      assert(model.minibarCollection.at(3).get('focus'));
      appEvents.trigger('keyboard.room.5', { key: 5 });
      assert(model.minibarCollection.at(4).get('focus'));
    });

    it('should set the correct org state and selectedOrg name on room event > 3', function(){
      appEvents.trigger('keyboard.room.4', { key: 4 });
      assert.equal(model.get('state'), 'org');
      assert.equal(model.get('selectedOrgName'), 'troupe');
      appEvents.trigger('keyboard.room.5', { key: 5 });
      assert.equal(model.get('selectedOrgName'), 'gitterHQ');
    });

    it('should focus change menu state to search on cmd+s', function(){
      appEvents.trigger('keyboard.focus.search');
      assert.equal(model.get('state'), 'search');
    });

  });

  describe('arrow key movement', function(){
    it('it should focus the next minibar item when down is pressed', function(){
      appEvents.trigger('keyboard.room.4', { key: 4 });
      appEvents.trigger('keyboard.room.down');
      assert(model.minibarCollection.at(4).get('focus'));
      assert.equal(model.minibarCollection.at(3).get('focus'), false);
    });

    it('it should focus the first minibar item when down is pressed and the last item is focused', function(){
      appEvents.trigger('keyboard.room.5', { key: 5 });
      appEvents.trigger('keyboard.room.down');
      assert(model.minibarCollection.at(0).get('focus'));
      assert.equal(model.minibarCollection.at(4).get('focus'), false);
    });

    it('should change menu state after a short delay when the down arrow key is pressed', function(done){
      appEvents.trigger('keyboard.room.3');
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
      appEvents.trigger('keyboard.room.4', { key: 4 });
      appEvents.trigger('keyboard.room.up');
      assert(model.minibarCollection.at(2).get('focus'));
      assert.equal(model.minibarCollection.at(3).get('focus'), false);
    });

    it('it should focus the last minibar item when up is pressed and the first item is focused', function(){
      appEvents.trigger('keyboard.room.1');
      appEvents.trigger('keyboard.room.up');
      assert(model.minibarCollection.at(4).get('focus'));
      assert.equal(model.minibarCollection.at(0).get('focus'), false);
    });

    it('should change menu state after a short delay when the up arrow key is pressed', function(done){
      appEvents.trigger('keyboard.room.3');
      appEvents.trigger('keyboard.room.up');
      appEvents.trigger('keyboard.room.up');
      appEvents.trigger('keyboard.room.up');
      assert.equal(model.get('state'), 'people');
      setTimeout(function(){
        assert.equal(model.get('state'), 'org');
        assert.equal(model.get('selectedOrgName'), 'gitterHQ');
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
      appEvents.trigger('keyboard.room.prev');
      assert(!view.getFocussedRoomItem());
      assert(model.minibarCollection.findWhere({ active: true}).get('focus'));
    });

  });

  describe('bluring items', function(){
    it('should blur the previously selected minibar item', function(){
      appEvents.trigger('keyboard.room.1');
      appEvents.trigger('keyboard.room.2');
      appEvents.trigger('keyboard.room.4', { key: 4 });
      appEvents.trigger('keyboard.room.5', { key: 5 });
      var items = model.minibarCollection.where({ focus: true });
      assert.equal(items.length, 1);
    });

    it('should blur every item that is in focus when blurAllItems is called', function(){
      //Focus all the things
      model.minibarCollection.at(0).set('focus', true);
      model.minibarCollection.at(3).set('focus', true);
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

  });

});
