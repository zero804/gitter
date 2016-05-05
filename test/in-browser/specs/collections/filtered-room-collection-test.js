/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert                 = require('assert');
var Backbone               = require('backbone');
var FilteredRoomCollection = require('public/js/collections/filtered-room-collection');
var MockRoomCollection     = require('fixtures/helpers/room-collection');

describe('FilteredRoomCollection()', function() {

  var model;
  var filteredRoomCollection;
  var roomCollection;

  beforeEach(function() {
    model = new Backbone.Model();
    roomCollection = new MockRoomCollection();

    filteredRoomCollection = new FilteredRoomCollection(null, {
      roomModel: model,
      collection: roomCollection,
    });
  });

  it('should throw an error if no model is passed', function() {
    try {new FilteredRoomCollection();}
    catch (e) {
      assert.equal(e.message, 'A valid RoomMenuModel must be passed to a new instance of FilteredRoomCollection');
    }
  });

  it('should throw an error if no collection is passed', function() {
    try { new FilteredRoomCollection(null, { roomModel: model });}
    catch (e) {
      assert.equal(e.message, 'A valid RoomCollection must be passed to a new instance of FilteredRoomCollection');
    }
  });

  it('should assign the roomModel', function() {
    assert(filteredRoomCollection.roomModel);
  });

  it('should return favourite models when the model is in the favourite state', function(done) {
    roomCollection.on('snapshot', function() {
      model.set('state', 'favourite');
      filteredRoomCollection.models.forEach(function(model) {
        assert(model.get('favourite'));
      });
      done();
    });
  });

  it('should filter one to ones when in the people state', function(done) {

    roomCollection.on('snapshot', function() {
      model.set('state', 'people');
      filteredRoomCollection.models.forEach(function(model) {
        assert(model.get('githubType') === 'ONETOONE');
      });

      done();
    });
  });

  it('should filter everything when in the search state', function(done) {
    roomCollection.on('snapshot', function() {
      model.set('state', 'search');
      assert.equal(0, filteredRoomCollection.length);
      done();
    });
  });

  it('should proxy the snapshot event', function(done) {
    filteredRoomCollection.on('snapshot', function() {
      assert(true);
      done();
    });
  });

  it('should filter org rooms when in an org state', function(done) {

    roomCollection.on('snapshot', function() {
      model.set({ state: 'org', selectedOrgName: 'gitterHQ' });
      filteredRoomCollection.models.forEach(function(model) {
        assert(/^ORG/.test(model.get('githubType')));
      });

      done();
    });

  });

  it('should sort first by mentions', function(){
    roomCollection.on('snapshot', function(){
      var first = roomCollection.get(8);  first.set('mentions', true);
      var second = roomCollection.get(7); second.set('mentions', true);
      filteredRoomCollection.sort();
      assert(filteredRoomCollection.models[0].get('id') === 7);
      assert(filteredRoomCollection.models[1].get('id') === 8);
    });
  });

});
