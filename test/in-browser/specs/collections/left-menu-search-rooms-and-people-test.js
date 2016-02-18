/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert                                 = require('assert');
var sinon                                  = require('sinon');
var Backbone                               = require('backbone');
var LeftMenuSearchRoomsAndPeopleCollection = require('public/js/collections/left-menu-search-rooms-and-people.js');

describe('LeftMenuSearchRoomsAndPeopleCollection', function(){

  var collection;
  var model;
  beforeEach(function(){
    model = new Backbone.Model({ state: 'all', searchTerm: ' ' });
    collection = new LeftMenuSearchRoomsAndPeopleCollection(null, { roomMenuModel: model });
    collection.searchRoomCollection.fetch = sinon.spy();
    collection.searchPeopleCollection.fetch = sinon.spy();
  });

  it('should throw an error if no roomMenuModel is passed', function(){
    try { new LeftMenuSearchRoomsAndPeopleCollection(); }
    catch(e) {
      assert.equal(e.message, 'A valid instance of RoomMenuModel should be passed to a new LeftMenuSearchRoomsAndPeopleCollection');
    }
  });

  it('should add a people & room search collection', function(){
    assert(collection.searchPeopleCollection);
    assert(collection.searchRoomCollection);
  });

  it('should call fetch on its child collection when the model is in a search state and there is a valid searchTerm', function(){
    model.set('state', 'search');
    model.set('searchTerm', 'thisissomesearch');
    assert.equal(1, collection.searchPeopleCollection.fetch.callCount);
    assert.equal(1, collection.searchRoomCollection.fetch.callCount);
  });

  it('should not call fetch when the search term in ""', function(){
    model.set('state', 'search');
    model.set('searchTerm', 'thisissomesearch');
    model.set('searchTerm', '');
    assert.equal(1, collection.searchPeopleCollection.fetch.callCount);
    assert.equal(1, collection.searchRoomCollection.fetch.callCount);
  });

  it('should reset the collections when the search term is ""', function(){
    model.set('state', 'search');
    model.set('searchTerm', 'thisissomesearch');
    model.set('searchTerm', '');
    assert.equal(0, collection.searchPeopleCollection.length);
    assert.equal(0, collection.searchRoomCollection.length);
  });

  it('should call fetch when the model is not in search state', function(){
    model.set('state', 'all');
    model.set('searchTerm', 'thisissomesearch');
    assert.equal(0, collection.searchPeopleCollection.fetch.callCount);
    assert.equal(0, collection.searchRoomCollection.fetch.callCount);
  });

  it('should merge its models when the collections update', function(){
    collection.searchRoomCollection.add([ {name: 'test1', id: 1 }, { name:'test2', id: 2} ]);
    collection.searchPeopleCollection.add([ {name: 'test1', id: 3 }, { name:'test2', id: 4} ]);
    assert.equal(4, collection.length);
  });

});
