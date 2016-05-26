/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
var sinon = require('sinon');
var Backbone = require('backbone');
var LeftMenuSuggestions = require('../../../../public/js/collections/left-menu-suggested-by-room');

describe('LeftMenuSuggestions()', function() {

  var collection;
  var model;
  var troupeModel;

  beforeEach(function() {
    model = new Backbone.Model({ state: '' });
    troupeModel = new Backbone.Model({ id: 1 });
    collection = new LeftMenuSuggestions(null, {
      roomMenuModel: model,
      troupeModel:   troupeModel,
    });
    collection.fetch = sinon.spy();
  });

  it('should throw an error if no roomModel is passed', function(done) {
    try {
      new LeftMenuSuggestions(null, {});
    }
    catch (e) {
      assert.equal(e.message,
                   'A valid instance of a RoomMenuModel must be passed to a new instance of LeftMenuSuggestionsCollection');
      done();
    }
  });

  it('should attach the room menu model', function() {
    assert(collection.roomMenuModel);
  });

  it('should throw an error if no troupe model is passed', function() {
    try {
      new LeftMenuSuggestions(null, { roomMenuModel: model });
    }
    catch (e) {
      assert.equal(e.message, 'A valid instance of a TroupeModel must be passed to a new instance of LeftMenuSuggestionsCollection');
    }
  });

  it('should generate a contextModel', function() {
    assert(collection.contextModel);
  });

  it('should fetch when the roomMenuModel changes to the all state', function(){
    model.set('state', 'all');
    assert.equal(1, collection.fetch.callCount);
  });

  it('should not fetch when the roomMenuModel is not in the all state', function(){
    model.set('state', 'all');
    model.set('state', 'people');
    assert.equal(1, collection.fetch.callCount);
  });

  it('should fetch when the troupeModel changes id', function(){
    model.set('state', 'all');
    troupeModel.set('id', 12345);
    assert.equal(2, collection.fetch.callCount);
  });

  it('should not fetch when the troupeModel changes id to null', function(){
    model.set('state', 'all');
    troupeModel.set('id', null);
    assert.equal(1, collection.fetch.callCount);
  });

  it('should sync the roomId of its context model to that of the troupeModel', function(){
    model.set('state', 'all');
    troupeModel.set('id', 12345);
    assert.equal(12345, collection.contextModel.get('roomId'));
  });

});
