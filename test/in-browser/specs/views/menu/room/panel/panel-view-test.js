/*global describe:true, it:true, beforeEach:true, afterEach:true */
'use strict';

var assert    = require('assert');
var sinon     = require('sinon');
var Backbone  = require('backbone');
var PanelView = require('public/js/views/menu/room/panel/panel-view');
var appEvents = require('public/js/utils/appevents');

describe('PanelView', function() {

  var model;
  var el;
  var panelView;

  beforeEach(function() {
    //sandbox = sinon.sandbox.create();
    //sandbox.stub(PanelView.prototype, 'onLastRoomItemSelected');

    el        = document.createElement('div');
    model     = new Backbone.Model({ panelOpenState: false });
    panelView = new PanelView({ model: model, el: el, bus: Backbone.Events });
  });

  afterEach(function() {
    //sandbox.restore();
  });

  it('should toggle a class on it\'s el when it\'s model changes', function(done) {
    assert.ok(!el.classList.contains('active'));
    model.set('panelOpenState', true);
    assert.ok(el.classList.contains('active'));
    model.set('panelOpenState', false);
    assert.ok(!el.classList.contains('active'));
    done();
  });

  it.skip('should set the panelOpenState to false on swipe left', function() {
    assert.ok(!model.get('panelOpenState'));
    model.set('panelOpenState', true);
    assert.ok(model.get('panelOpenState'));
    appEvents.trigger('ui:swipeleft', { target: el });
    assert.ok(!model.get('panelOpenState'));
  });

  it('should change the panelOpenState to false when a search item is selected', function() {
    sinon.stub(PanelView.prototype, 'onSearchItemSelected');
    panelView = new PanelView({ model: model, el: el, bus: Backbone.Events });
    Backbone.Events.trigger('focus.request.chat');
    assert.equal(1, panelView.onSearchItemSelected.callCount);
    assert.equal(false, panelView.model.get('panelOpenState'));
  });

  it('should not change the panelState to false when a search item is selected when the panel is pinned', function() {
    model.set('roomMenuIsPinned', true);
    model.set('panelOpenState', true);
    Backbone.Events.trigger('focus.request.chat');
    assert.ok(panelView.model.get('panelOpenState'));
  });

  //need to fix sandboxing
  it.skip('should react to room-menu:keyboard:select-last events', function() {
    Backbone.Events.trigger('room-menu:keyboard:select-last');
    assert.equal(1, panelView.onLastRoomItemSelected.callCount);
  });

});
