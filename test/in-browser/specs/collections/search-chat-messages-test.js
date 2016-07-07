/*global describe:true, it:true, beforeEach:true, afterEach:true */
'use strict';

var assert = require('assert');
var Backbone = require('backbone');
var sinon = require('sinon');
var SearchChatMessages = require('public/js/collections/search-chat-messages');

describe('SearchChatMessages', function() {

  var model;
  var room;
  var collection;
  var query;

  beforeEach(function() {
    model = new Backbone.Model({ state: 'all' });
    room = new Backbone.Model({ id: 1 });
    query = new Backbone.Model();
    collection = new SearchChatMessages(null, { roomMenuModel: model, roomModel: room, queryModel: query });
    collection.fetch = sinon.spy();
  });

  it('should set the roomMenuModel', function() {
    assert(collection.roomMenuModel);
  });

  it('should set the room model', function() {
    assert(collection.roomModel);
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
    assert.equal('/v1/rooms/123456/chatMessages', collection.url());
  });

});
