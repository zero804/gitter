/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
var Backbone = require('backbone');
var SuggestedRoomsByRoomCollection = require('public/js/collections/room-suggested-rooms');

describe('SuggestedRoomsByRoomCollection()', function() {

  var suggestedCollection;
  var model;
  beforeEach(function() {
    model = new Backbone.Model({ roomId: 'test' });
    suggestedCollection = new SuggestedRoomsByRoomCollection(null, {
      contextModel: model,
    });
  });

  it('should create a url model when initialized with a model', function() {
    assert.ok(suggestedCollection.urlModel);
  });

  it('should change its url when the model changes', function() {
    assert.equal('/v1/rooms/test/suggestedRooms', suggestedCollection.url());
    model.set('roomId', 'thisisatest');
    assert.equal('/v1/rooms/thisisatest/suggestedRooms', suggestedCollection.url());
  });

});
