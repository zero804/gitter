/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert             = require('assert');
var Backbone           = require('backbone');
var RoomMenuView       = require('../../../public/js/views/menu/room-menu-view');
var MockRoomCollection = require('../fixtures/helpers/room-collection');

describe('RoomMenuView', function() {

  var el;
  var model;
  var roomCollection;
  var roomMenuView;

  beforeEach(function() {
    el             = document.createElement('div');
    model          = new Backbone.Model({
      setState: function(){},
      defults: { panelOpenState: false }
    });

    roomCollection = new MockRoomCollection();
    roomMenuView   = new RoomMenuView({ el: el, model: model, roomCollection: roomCollection, bus: Backbone.Events});
  });

  it.skip('should change the models panel state when the correct event is triggered', function() {

    assert.ok(!model.get('panelOpenState'));

    roomMenuView.minibar.trigger('minibar:clicked');
    assert.ok(model.get('panelOpenState'));

    roomMenuView.minibar.trigger('minibar:clicked');
    assert.ok(!model.get('panelOpenState'));
  });


});
