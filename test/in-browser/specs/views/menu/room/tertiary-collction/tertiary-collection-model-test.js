/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert                  = require('assert');
var Backbone                = require('backbone');
var TertiaryCollectionModel = require('../../../../../../../public/js/views/menu/room/tertiary-collection/tertiary-collection-model');

describe.skip('TeritaryCollectionModel', function(){

  var model;
  var collectionModel;
  beforeEach(function(){
    model = new Backbone.Model();
    collectionModel = new TertiaryCollectionModel({}, { model: model });
  });

  it('should throw an error if instantiated with no model', function(){
    try {
      new TertiaryCollectionModel({});
    }
    catch(e) {
      assert.equal(e.message, 'Avalid instance of RoomMenuModel must be passed to a new instance of TertiaryCollectionModel');
    }
  });

  it.skip('should change its active state when its model is in the correct states', function(){
    assert(!collectionModel.get('tertiaryCollectionActive'));
    model.set('state', 'all');
    assert(collectionModel.get('tertiaryCollectionActive'));
    model.set('state', 'search');
    assert(!collectionModel.get('tertiaryCollectionActive'));
  });

  it('should have the correct collection header value', function(){
    model.set('state', 'all');
    assert.equal('Your Organisations', collectionModel.get('tertiaryCollectionHeader'));
  });

});
