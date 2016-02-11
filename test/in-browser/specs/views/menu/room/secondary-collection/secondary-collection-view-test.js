/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert                  = require('assert');
var _                       = require('underscore');
var Backbone                = require('backbone');
var SecondaryCollectionView = require('public/js/views/menu/room/secondary-collection/secondary-collection-view.js');

describe('SecondaryCollectionView', function() {

  var roomMenuModel;
  var model;
  var collection;
  var el;
  var secondaryCollectionView;
  var primaryCollection;

  beforeEach(function() {
    roomMenuModel           = new Backbone.Model({ state: 'all' });
    collection              = new Backbone.Collection(null);
    el                      = document.createElement('div');
    model                   = new Backbone.Model({ active: true });
    primaryCollection       = new Backbone.Collection();
    secondaryCollectionView = new SecondaryCollectionView({
      el:                el,
      model:             model,
      roomMenuModel:     roomMenuModel,
      collection:        collection,
      primaryCollection: primaryCollection,
    });
  });

  it('should remove an active class when the roomMenuModel is in the all state and the collection has no items', function(){
    roomMenuModel.set('state', 'all');
    secondaryCollectionView.render();
    assert(!el.classList.contains('active'));
  });

  it('should add an active class when the roomMenuModel is in the all state and the collection has items', function(){
    roomMenuModel.set('state', 'all');
    collection.add({});
    secondaryCollectionView.render();
    assert(el.classList.contains('active'));
  });

  it('should remove an active class if the primary collection has more than 10 items', function(){

    roomMenuModel.set('state', 'all');

    primaryCollection.add({ id: 1 });
    primaryCollection.add({ id: 2 });
    primaryCollection.add({ id: 3 });
    primaryCollection.add({ id: 4 });
    primaryCollection.add({ id: 5 });
    primaryCollection.add({ id: 6 });
    primaryCollection.add({ id: 7 });
    primaryCollection.add({ id: 8 });
    primaryCollection.add({ id: 9 });
    primaryCollection.add({ id: 10 });

    secondaryCollectionView.render();
    assert(!el.classList.contains('active'));
  });

  it('should remove an active class in the search state with no search term', function(){
    roomMenuModel.set({ state: 'search', searchTerm: '' });
    secondaryCollectionView.render();
    assert(!el.classList.contains('active'));
  });

  it('should add an active class in the search state with a search term', function(){
    roomMenuModel.set({ state: 'search', searchTerm: 'thisisareallylongsearchterm' });
    secondaryCollectionView.render();
    assert(el.classList.contains('active'));
  });

  it('should toggle active classes in search state after render dependant on search term', function(){
    roomMenuModel.set({ state: 'search', searchTerm: 'thisisareallylongsearchterm' });
    secondaryCollectionView.render();
    assert(el.classList.contains('active'));
    roomMenuModel.set('searchTerm', '');
    assert(!el.classList.contains('active'));
    roomMenuModel.set('searchTerm', 'term');
    assert(el.classList.contains('active'));
  });

  it('should remove an active class when the roomMenuModel is in the favourite state and the collection has no items', function(){
    roomMenuModel.set('state', 'favourite');
    secondaryCollectionView.render();
    assert(!el.classList.contains('active'));
  });

  it('should add an active class when the roomMenuModel is in the favourite state and the collection has items', function(){
    roomMenuModel.set('state', 'favourite');
    collection.add({});
    secondaryCollectionView.render();
    assert(el.classList.contains('active'));
  });

  it('should remove an active class when the roomMenuModel is in the people state and the collection has no items', function(){
    roomMenuModel.set('state', 'people');
    secondaryCollectionView.render();
    assert(!el.classList.contains('active'));
  });

  it('should add an active class when the roomMenuModel is in the people state and the collection has items', function(){
    roomMenuModel.set('state', 'people');
    collection.add({});
    secondaryCollectionView.render();
    assert(el.classList.contains('active'));
  });

  it('should remove an active class when the roomMenuModel is in the org state and the collection has no items', function(){
    roomMenuModel.set('state', 'org');
    secondaryCollectionView.render();
    assert(!el.classList.contains('active'));
  });

  it('should add an active class when the roomMenuModel is in the org state and the collection has items', function(){
    roomMenuModel.set('state', 'org');
    collection.add({});
    secondaryCollectionView.render();
    assert(el.classList.contains('active'));
  });

});
