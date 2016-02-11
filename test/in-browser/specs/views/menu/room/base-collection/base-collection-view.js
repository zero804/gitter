/*global describe:true, it:true, beforeEach:true, afterEach:true */
'use strict';

var assert             = require('assert');
var sinon              = require('sinon');
var Backbone           = require('backbone');
var BaseCollectionView = require('public/js/views/menu/room/base-collection/base-collection-view');

describe('BaseCollectionView', function(){

  var collectionView;
  var collection;
  var roomMenuModel;
  var model;
  beforeEach(function(){
    collection     = new Backbone.Collection();
    roomMenuModel  = new Backbone.Model({ state: ''} );
    model          = new Backbone.Model();
    collectionView = new BaseCollectionView({
      bus:           Backbone.Events,
      collection:    collection,
      roomMenuModel: roomMenuModel,
      model:         model,
    });
  });

  it('Should call setActive after render', function(){
    collectionView.setActive = sinon.spy();
    collectionView.render();
    assert.equal(1, collectionView.setActive.callCount);
  });

  it('Should call setLoaded before & after render', function(){
    collectionView.setLoaded = sinon.spy();
    collectionView.render();
    assert.equal(2, collectionView.setLoaded.callCount);
  });

});
