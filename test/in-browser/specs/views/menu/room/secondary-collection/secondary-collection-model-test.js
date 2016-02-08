/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert                   = require('assert');
var Backbone                 = require('backbone');
var SecondaryCollectionModel = require('../../../../../../../public/js/views/menu/room/secondary-collection/secondary-collection-model');

describe.skip('SecondaryCollectionModel', function(){

  var model;
  var collectionModel;
  beforeEach(function(){
    model = new Backbone.Model();
    collectionModel = new SecondaryCollectionModel({}, { model: model });
  });

  it('should throw an error if no model is passed', function(){
    try {
      new SecondaryCollectionModel();
    }
    catch(e) {
      assert.equal(e.message,
                   'A valid instance of the roomMenuModel should be passed to a new instance of SecondaryCollectionModel');
    }
  });

  it('should set the correct variables when the model is in the search state', function(){
    model.set('state', 'search');
    assert.equal('Chat Messages', collectionModel.get('secondaryCollectionHeader'));
    assert(collectionModel.get('secondaryCollectionActive'));
  });

  it('should set the correct variables when the model is in the org state', function(){
    model.set('state', 'org');
    assert.equal('All Rooms', collectionModel.get('secondaryCollectionHeader'));
    assert(collectionModel.get('secondaryCollectionActive'));
  });

  it('should set the correct variables when the model is in the all state', function(){
    model.set('state', 'all');
    assert.equal('Your Suggestions', collectionModel.get('secondaryCollectionHeader'));
    assert(collectionModel.get('secondaryCollectionActive'));
  });

  it('should deactive the secondary collection when in any other state', function(){
    model.set('state', 'somerandomstate');
    assert(!collectionModel.get('secondaryCollectionActive'));
  });

});
