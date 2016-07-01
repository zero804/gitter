/*global describe:true, it:true, beforeEach:true, afterEach:true */
'use strict';

var assert = require('assert');
var Backbone = require('backbone');
var sinon = require('sinon');
var BaseCollectionModel = require('public/js/views/menu/room/base-collection/base-collection-model');

describe('BaseCollectionModel()', function() {

  var model;
  var roomMenuModel;
  beforeEach(function() {
    roomMenuModel = new Backbone.Model({ state: '' });
    model = new BaseCollectionModel(null, { roomMenuModel: roomMenuModel });
    model.onAll = sinon.spy();
    model.onSearch = sinon.spy();
    model.onFavourite = sinon.spy();
    model.onPeople = sinon.spy();
    model.onOrg = sinon.spy();
  });

  it('should call onAll when the model moves into a search state', function() {
    roomMenuModel.set('state', 'all');
    roomMenuModel.trigger('change:state:post');
    assert.equal(1, model.onAll.callCount);
  });

  it('should call onSearch when the model moves into a search state', function() {
    roomMenuModel.set('state', 'search');
    roomMenuModel.trigger('change:state:post');
    assert.equal(1, model.onSearch.callCount);
  });

  it('should call onPeople when the model moves into a search state', function() {
    roomMenuModel.set('state', 'people');
    roomMenuModel.trigger('change:state:post');
    assert.equal(1, model.onPeople.callCount);
  });

  it('should call onOrg when the model moves into a search state', function() {
    roomMenuModel.set('state', 'org');
    roomMenuModel.trigger('change:state:post');
    assert.equal(1, model.onOrg.callCount);
  });

});
