/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert             = require('assert');
var Backbone           = require('backbone');
var RoomMenuView       = require('public/js/views/menu/room/layout/room-menu-layout');
var MockRoomCollection = require('fixtures/helpers/room-collection');

describe('RoomMenuLayout', function() {

  var el;
  var model;
  var roomCollection;
  var leftMenuView;

  beforeEach(function() {
    el             = document.createElement('div');
    model          = new Backbone.Model({
      panelOpenState: false,
    });
    model.setState = function(){};

    roomCollection = new MockRoomCollection();
    leftMenuView   = new RoomMenuView({
      el: el,
      model: model,
      roomCollection: roomCollection,
      bus: Backbone.Events
    });
  });

  it.skip('should change the models panel state when the correct event is triggered', function() {

    assert.ok(!model.get('panelOpenState'));
    leftMenuView.minibar.trigger('minibar:clicked');
    assert.ok(model.get('panelOpenState'));

  });

});
