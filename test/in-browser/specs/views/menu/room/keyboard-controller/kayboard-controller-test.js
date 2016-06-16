"use strict";

var assert = require('assert');
var Backbone = require('backbone');
var _ = require('underscore');
var KeyboardControllerView = require('public/js/views/menu/room/keyboard-controller/keyboard-controller-view');
var appEvents = require('utils/appevents');

describe('KeyboardControllerView', function(){

  var view;
  var model;
  beforeEach(function(){
    model = new Backbone.Model();
    model.minibarCollection = new Backbone.Collection([
      { type: 'all', name: 'all' },
      { type: 'search', name: 'search' },
      { type: 'people', name: 'people' },
      { type: 'org', name: 'troupe' },
      { type: 'org', name: 'gitterHQ' },
    ]);
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
      }, 101);
    });

  });

});
