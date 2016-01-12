/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert                  = require('assert');
var Backbone                = require('backbone');
var SecondaryCollectionView = require('public/js/views/menu/room/secondary-collection/secondary-collection-view.js');

describe('SecondaryCollectionView', function() {

  var model;
  var el;
  var secondaryCollectionView;

  beforeEach(function() {
    model = new Backbone.Model({ state: 'all' });
    el = document.createElement('div');
    secondaryCollectionView = new SecondaryCollectionView({
      el:    el,
      model: model
    });
  });

  it('should assign an active class if the model is in the search || org state', function() {
    assert.ok(!secondaryCollectionView.el.classList.contains('active'));
    model.set('state', 'search');
    assert.ok(secondaryCollectionView.el.classList.contains('active'));
    model.set('state', 'all');
    assert.ok(!secondaryCollectionView.el.classList.contains('active'));
    model.set('state', 'org');
    assert.ok(secondaryCollectionView.el.classList.contains('active'));
  });

  it('should remove the active class with a valid searchTerm in the search state', function(){
    assert.ok(!secondaryCollectionView.el.classList.contains('active'));
    model.set('state', 'search');
    assert.ok(secondaryCollectionView.el.classList.contains('active'));
    model.set('searchTerm', '1');
    assert.ok(!secondaryCollectionView.el.classList.contains('active'));
  });

  it('should add the active class when an empty search term is passed', function(){
    assert.ok(!secondaryCollectionView.el.classList.contains('active'));
    model.set('state', 'search');
    assert.ok(secondaryCollectionView.el.classList.contains('active'));
    model.set('searchTerm', '1');
    assert.ok(!secondaryCollectionView.el.classList.contains('active'));
    model.set('searchTerm', '');
    assert.ok(secondaryCollectionView.el.classList.contains('active'));
  });

});
