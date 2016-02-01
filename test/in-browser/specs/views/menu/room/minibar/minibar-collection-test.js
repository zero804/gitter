/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert             = require('assert');
var MinibarCollection  = require('public/js/views/menu/room/minibar/minibar-collection');
var MockRoomCollection = require('fixtures/helpers/room-collection');

describe('MinibarCollection()', function() {

  var roomCollection;
  var collection;
  beforeEach(function() {
    roomCollection = new MockRoomCollection();
    collection = new MinibarCollection(null, {
      roomCollection: roomCollection,
    });
  });

  it('should throw an error if no roomColleciton is passed', function() {
    try { new MinibarCollection(); }
    catch (e) {
      assert.equal(e.message, 'A valid RoomCollection must be passed to a new instance of MinibarCollection');
    }
  });

  it('should be instantiated with defaults', function() {
    assert.equal('all', collection.at(0).get('type'));
    assert.equal('search', collection.at(1).get('type'));
    assert.equal('favourite', collection.at(2).get('type'));
    assert.equal('people', collection.at(3).get('type'));
  });

  it('should maintain defaults after a snapshot', function(done) {
    roomCollection.on('snapshot', function() {
      assert.equal('all', collection.at(0).get('type'));
      assert.equal('search', collection.at(1).get('type'));
      assert.equal('favourite', collection.at(2).get('type'));
      assert.equal('people', collection.at(3).get('type'));
      done();
    });
  });

  it('should add models on snapshot', function(done) {
    roomCollection.on('snapshot', function() {
      assert.equal('org', collection.at(4).get('type'));
      done();
    });
  });

  it('should only ever contain one instance of a default', function(done) {
    roomCollection.on('snapshot', function() {
      assert.equal(1, collection.where({ type: 'search' }).length);
      done();
    });
  });

  it('should update the collection when a model is added', function() {
    roomCollection.on('snapshot', function() {
      roomCollection.add({ name: 'cutandpastey', githubType: 'ORG', url: '/cutandpastey' });
      assert(collection.findWhere({ name: 'cutandpastey' }));
    });
  });

});
