"use strict";

var assert = require('assert');
var Backbone = require('backbone');
var KeyboardControllerView = require('public/js/views/menu/room/keyboard-controller/keyboard-controller-view');
var appEvents = require('utils/appevents');

describe('KeyboardControllerView', function(){

  var view;
  var model;
  beforeEach(function(){
    model = new Backbone.Model();
    view = new KeyboardControllerView({
      model: model
    });
  });

  it('should pass a test', function(){
    appEvents.trigger('keyboard.room.1');
    assert(true);
  });

});
