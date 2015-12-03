/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert                = require('assert');
var Backbone              = require('backbone');
var PrimaryCollectionView = require('public/js/views/menu/room/primary-collection/primary-collection-view');

describe('PrimaryCollectionView', function() {

  var collection;
  var model;
  var el;
  var primaryCollectionView;

  beforeEach(function() {
    el = document.createElement('div');
    model = new Backbone.Model({ state: 'all' });
    collection = new Backbone.Collection();
    primaryCollectionView = new PrimaryCollectionView({
      el: el,
      model: model,
      collection: collection,
    });
  });

  it('should add a class to its element when its model is in a search state', function() {
    assert.ok(el.classList.contains('active'));
    model.set('state', 'search');
    assert.ok(!el.classList.contains('active'));
    model.set('state', 'all');
    assert.ok(el.classList.contains('active'));
  });

});
