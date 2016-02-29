/*global describe:true, it:true, beforeEach:true, afterEach:true */
'use strict';

var assert             = require('assert');
var Backbone           = require('backbone');
var sinon              = require('sinon');
var SearchChatMessages = require('public/js/collections/search-chat-messages');

describe('SearchChatMessages', function() {

  var model;
  var room;
  var collection;

  beforeEach(function() {
    model            = new Backbone.Model({ state: 'all' });
    room             = new Backbone.Model({ id: 1 });
    collection       = new SearchChatMessages(null, { roomMenuModel: model, roomModel: room });
    collection.fetch = sinon.spy();
  });

  it('should throw an error if no room menu is passed', function(done) {
    try { new SearchChatMessages(); }
    catch (e) {
      assert.equal(e.message, 'A valid instance of RoomMenuModel must be passed to a new instance of SearchChatMessages');
      done();
    }
  });

  it('should throw an error is no roomModel is passed', function() {
    try { new SearchChatMessages(null, { roomMenuModel: model });}
    catch (e) {
      assert.equal(e.message, 'A valid instance of a roomModel must be passed to a new Instance of SearchChatMessages');
    }
  });

  it('should set the roomMenuModel', function() {
    assert(collection.roomMenuModel);
  });

  it('should set the room model', function() {
    assert(collection.roomModel);
  });

  it('should fetch under the right conditions', function() {
    room.set('id', 123456);
    model.set({ state: 'search', searchTerm: 'sometestsearch' });
    assert.equal(1, collection.fetch.callCount);
  });

  it('should not fetch when the model is not in a search state', function() {
    room.set('id', 123456);
    model.set('searchTerm', 'this is a search');
    assert.equal(0, collection.fetch.callCount);
  });

  it('should not fetch when the room has no id', function() {
    model.set('searchTerm', 'this is a search');
    assert.equal(0, collection.fetch.callCount);
  });

  it('should not search when there is no search term', function() {
    room.set('id', 123456);
    model.set('state', 'search');
    assert.equal(0, collection.fetch.callCount);
  });

  it('should contain the right url when it fetches', function() {
    room.set('id', 123456);
    model.set({ state: 'search', searchTerm: 'sometestsearch' });
    console.log(collection.url());
    assert.equal('/v1/rooms/123456/chatMessages', collection.url());
  });

});
