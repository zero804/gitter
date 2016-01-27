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
    collection     = new Backbone.Collection(null);
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

});
