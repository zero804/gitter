/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert                 = require('assert');
var Backbone               = require('backbone');
var TertiaryCollectionView = require('public/js/views/menu/room/tertiary-collection/tertiary-collection-view');

describe.only('TertiaryCollectionView', function() {

  var el;
  var view;
  var roomMenuModel;
  var model;
  var collection;

  beforeEach(function() {
    el            = document.createElement('div');
    model         = new Backbone.Model({ active: true });
    roomMenuModel = new Backbone.Model();
    collection    = new Backbone.Collection(null);
    view          = new TertiaryCollectionView({
      el:            el,
      roomMenuModel: roomMenuModel,
      collection:    collection,
      model:         model,
    });
  });

  it('it should assign an active class in the all state with no collection items', function() {
    roomMenuModel.set('state', 'all');
    view.render();
    assert(!el.classList.contains('active'));
  });

  it('it should remove an active class in the all state with collection items', function() {
    roomMenuModel.set('state', 'all');
    collection.add({});
    view.render();
    assert(el.classList.contains('active'));
  });

  it('should only display in the search state when the is no search term', function() {
    roomMenuModel.set({ state: 'search', searchTerm: '' });
    view.render();
    assert(el.classList.contains('active'));
    roomMenuModel.set('searchTerm', 'term');
    assert(!el.classList.contains('active'));
    roomMenuModel.set('searchTerm', '');
    assert(el.classList.contains('active'));
  });

  it('it should assign an active class in the org state with no collection items', function() {
    roomMenuModel.set('state', 'org');
    view.render();
    assert(!el.classList.contains('active'));
  });

  it('it should remove an active class in the org state with collection items', function() {
    roomMenuModel.set('state', 'org');
    collection.add({});
    view.render();
    assert(el.classList.contains('active'));
  });



});
