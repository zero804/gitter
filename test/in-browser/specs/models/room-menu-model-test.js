/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert             = require('assert');
var Backbone           = require('backbone');
var ProxyCollection    = require('backbone-proxy-collection');
var MockRoomCollection = require('fixtures/helpers/room-collection');
var RoomMenuModel      = require('public/js/models/room-menu-model');

//TODO write tests for local storage save() && fetch();
describe('RoomMenuModel', function() {

  var roomMenuModel;
  var mockRoomCollection;
  beforeEach(function() {

    window.troupeContext = {
      leftRoomMenuState: {
        roomMenuIsPinned: true,
      },
    };

    mockRoomCollection = new MockRoomCollection();

    roomMenuModel = new RoomMenuModel({
      bus:            Backbone.Events,
      roomCollection: mockRoomCollection,
      userModel:      new Backbone.Model(),
      orgCollection:  new Backbone.Collection(null),
      troupeModel:    new Backbone.Model(),
    });

  });

  describe('arguments', function() {

    it('should throw an error if no message bus is passed', function(done) {

      try { new RoomMenuModel(); }
      catch (e) {
        assert.equal(e.message,
          'A valid message bus must be passed when creating a new RoomMenuModel');
        done();
      }

    });

    it('should throw an error if no room collection is passed', function(done) {

      try { new RoomMenuModel({ bus: Backbone.Events }); }
      catch (e) {
        assert.ok(e);
        assert.equal(e.message,
          'A valid room collection must be passed to a new RoomMenuModel');
        done();
      }

    });

    it('should throw an error if no user model is passed', function(done) {
      try {
        new RoomMenuModel({
          bus: Backbone.Events,
          roomCollection: mockRoomCollection,
        });
      }
      catch (e) {
        assert.equal(e.message,
                     'A valid user model must be passed to a new RoomMenuModel');
        done();
      }
    });

  });

  describe('state management', function() {

    it('should instantiate with the correct default state', function() {

      assert.equal('', roomMenuModel.get('state'));

    });

  });

  describe('events', function() {

    it('should change state when the correct events are fired', function() {

      Backbone.Events.trigger('room-menu:change:state', 'search');
      assert.equal('search', roomMenuModel.get('state'));

    });

    it('should emit pre & post state change events', function(done) {

      roomMenuModel.on('change:state:pre', function(oldState, newState) {
        assert.equal('', oldState);
        assert.equal('search', newState);
      });

      roomMenuModel.on('change:state:post', function(state) {
        assert.equal('search', state);
        done();
      });

      Backbone.Events.trigger('room-menu:change:state', 'search');

    });

    it.skip('should throw an error if an invalid state is passed to the change state event', function(done) {

      try {
        Backbone.Events.trigger('room-menu:change:state', 'all');
        Backbone.Events.trigger('room-menu:change:state', 'some-awesome-state');
      }
      catch (e) {
        assert.ok(e);
        assert.equal('all', roomMenuModel.get('state'));
        done();
      }

    });

    it('should emit an event when the primaryCollection emits a snapshot event', function(done) {
      roomMenuModel.on('primary-collection:snapshot', function() {
        assert.ok(true);
        done();
      });
    });

  });

  describe.skip('search', function() {

    it('should have a default search term', function() {

      assert.equal('', roomMenuModel.get('searchTerm'));

    });

    it('should contain a search term collection', function() {

      assert.ok(roomMenuModel.searchTerms);

    });

    it('should assign the search term collection to the secondary collection when in a search state', function() {

      roomMenuModel.set('state', 'search');
      assert.deepEqual(roomMenuModel.searchTerms, roomMenuModel.secondaryCollection.collection);

    });

    it('should only save a search term after a delay', function(done) {

      roomMenuModel.set('state', 'search');
      roomMenuModel.set('searchTerm', 't');
      roomMenuModel.set('searchTerm', 'te');
      roomMenuModel.set('searchTerm', 'ter');
      roomMenuModel.set('searchTerm', 'term');
      assert.equal(0, roomMenuModel.secondaryCollection.length);
      setTimeout(function() {
        assert.equal(1, roomMenuModel.secondaryCollection.length);
        assert.equal('term', roomMenuModel.secondaryCollection.at(0).get('term'));
        done();
      }, roomMenuModel.searchInterval);

    });

  });

  describe('child collections', function() {

    it('should be instantiated with two child collections', function() {

      assert.ok(roomMenuModel.secondaryCollection);
      assert.ok(roomMenuModel.secondaryCollection instanceof ProxyCollection);

    });

    it('should not sort the primary collection', function(done) {
      roomMenuModel.on('primary-collection:snapshot', function() {
        mockRoomCollection.forEach(function(model, index) {
          assert.equal(model, roomMenuModel.primaryCollection.at(index));
        });
        done();
      });
    });

    it('should set the roomMenuIsPinned to false if isMobile is true', function(done) {
      roomMenuModel.set('isMobile', true);
      roomMenuModel.fetch({
        success: function() {
          assert.ok(!roomMenuModel.get('roomMenuIsPinned'));
          done();
        },
      });
    });

    it('should set the roomMenuIsPinned to false if isMobile is true', function(done) {
      roomMenuModel.set('isMobile', true);
      roomMenuModel.fetch({
        success: function() {
          assert.ok(!roomMenuModel.get('panelOpenState'));
          done();
        },
      });
    });

  });
});
