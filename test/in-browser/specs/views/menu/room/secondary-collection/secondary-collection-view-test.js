/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert                  = require('assert');
var Backbone                = require('backbone');
var SecondaryCollectionView = require('public/js/views/menu/room/secondary-collection/secondary-collection-view.js');

describe.skip('SecondaryCollectionView', function() {

  var model;
  var collection;
  var el;
  var secondaryCollectionView;

  beforeEach(function() {
    model = new Backbone.Model({ state: 'all' });
    collection = new Backbone.Collection({});
    el = document.createElement('div');
    secondaryCollectionView = new SecondaryCollectionView({
      el:                el,
      model:             model,
      collection:        collection,
      primaryCollection: new Backbone.Collection({}),
    });
  });

  it('should assign an active class when the secondaryCollectionActive is true', function() {
    model.set('secondaryCollectionActive', false);
    assert.ok(!secondaryCollectionView.el.classList.contains('active'));
    model.set('secondaryCollectionActive', true);
    assert.ok(secondaryCollectionView.el.classList.contains('active'));
  });

  it('should remove the active class with a valid searchTerm in the search state', function() {
    assert.ok(!secondaryCollectionView.el.classList.contains('active'));
    model.set('state', 'search');
    model.set('secondaryCollectionActive', true);
    assert.ok(secondaryCollectionView.el.classList.contains('active'));
    model.set('searchTerm', '1');
    assert.ok(!secondaryCollectionView.el.classList.contains('active'));
  });

  it('should add the active class when an empty search term is passed', function() {
    assert.ok(!secondaryCollectionView.el.classList.contains('active'));
    model.set('state', 'search');
    model.set('secondaryCollectionActive', true);
    assert.ok(secondaryCollectionView.el.classList.contains('active'));
    model.set('searchTerm', '1');
    assert.ok(!secondaryCollectionView.el.classList.contains('active'));
    model.set('searchTerm', '');
    assert.ok(secondaryCollectionView.el.classList.contains('active'));
  });

  it('should toggle an empty class when the collection is empty', function(){
    assert.ok(!secondaryCollectionView.el.classList.contains('empty'));
    collection.reset();
    assert.ok(secondaryCollectionView.el.classList.contains('empty'));
    collection.add({});
    assert.ok(!secondaryCollectionView.el.classList.contains('empty'));
  });

});
