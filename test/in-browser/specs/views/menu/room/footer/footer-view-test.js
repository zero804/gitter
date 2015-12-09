/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert          = require('assert');
var Backbone        = require('backbone');
var PanelFooterView = require('public/js/views/menu/room/footer/footer-view');

describe('PanelFooterView', function() {

  var panelFooterView;
  var model;

  beforeEach(function() {
    model = new Backbone.Model({
      roomMenuIsPinned: false,
    });

    panelFooterView = new PanelFooterView({
      bus: Backbone.Events,
      model: model,
    });
  });

  it('should throw an error if it is instantiated with no events bus', function(done) {
    try {
      new PanelFooterView();
    }
    catch (e) {
      assert.equal(e.message, 'A valid event bus must be passed to a new instance of PanelFooterView');
      done();
    }
  });

  it('should emit an event (with the right payload) when the pin button is clicked', function(done) {
    Backbone.Events.on('room-menu:pin', function(roomMenuIsPinned) {
      assert.ok(roomMenuIsPinned);
      done();
    });

    assert.ok(!model.get('roomMenuIsPinned'));
    panelFooterView.render();
    panelFooterView.$el.find('#room-menu-footer-pin-button').click();
  });

  it('should toggle roomMenuIsPinned when the pin button is clicked', function(){
    panelFooterView.render();
    assert.ok(!model.get('roomMenuIsPinned'), 'Check initial roomMenuIsPinned value');
    panelFooterView.$el.find('#room-menu-footer-pin-button').click();
    assert.ok(model.get('roomMenuIsPinned'), 'check roomMenuIsPinned has been reversed');
  });

});
