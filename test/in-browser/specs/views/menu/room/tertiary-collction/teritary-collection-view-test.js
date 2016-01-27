/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert                 = require('assert');
var Backbone               = require('backbone');
var TertiaryCollectionView = require('public/js/views/menu/room/tertiary-collection/tertiary-collection-view');

describe('TertiaryCollectionView', function(){

  var collectionView;
  var model;
  var collection;

  beforeEach(function(){
    model          = new Backbone.Model({ tertiaryCollectionActive: false });
    collection     = new Backbone.Collection({ name: 'test' });
    collectionView = new TertiaryCollectionView({
      model:      model,
      collection: collection
    });
  });

  it('should assign an active class when the models tertairyCollectionActive is true', function(){
    assert(!collectionView.el.classList.contains('active'));
    model.set('tertiaryCollectionActive', true);
    assert(collectionView.el.classList.contains('active'));
    model.set('tertiaryCollectionActive', false);
    assert(!collectionView.el.classList.contains('active'));
  });

  it('should remove an active class if render is called with a collection length of 0', function(){
    var view = new TertiaryCollectionView({
      model: model,
      collection: new Backbone.Collection(),
    });
    model.set('tertiaryCollectionActive', true);
    view.render();
    assert(!view.el.classList.contains('active'));
  });

});
