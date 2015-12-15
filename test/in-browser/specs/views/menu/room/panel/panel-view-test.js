/*global describe:true, it:true, beforeEach:true, sinon: true */
'use strict';

var assert    = require('assert');
var Backbone  = require('backbone');
var PanelView = require('public/js/views/menu/room/panel/panel-view');
var appEvents = require('public/js/utils/appevents');

describe('PanelView', function() {

  var model;
  var el;
  var panelView;

  beforeEach(function() {
    el        = document.createElement('div');
    model     = new Backbone.Model({ panelOpenState: false });
    panelView = new PanelView({ model: model, el: el, bus: Backbone.Events });
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

  it('should change the panelOpenState to false when a search item is selected', function(){
    sinon.stub(PanelView.prototype, 'onSearchItemSelected');
    panelView = new PanelView({ model: model, el: el, bus: Backbone.Events });
    Backbone.Events.trigger('focus.request.chat');
    assert.equal(1, panelView.onSearchItemSelected.callCount);
    assert.equal(false, panelView.model.get('panelOpenState'));
  });

});
