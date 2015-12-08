/*global describe:true, it:true, beforeEach:true */
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
    panelView = new PanelView({ model: model, el: el });
  });

  //Sadly as we are using request animation frame some checks must be wrapped
  //in timeouts ... yuck jp 8/12/15
  it('should toggle a class on it\'s el when it\'s model changes', function(done) {
    assert.ok(!el.classList.contains('active'));
    model.set('panelOpenState', true);
    setTimeout(function() {
      assert.ok(el.classList.contains('active'));
      model.set('panelOpenState', false);
      setTimeout(function() {
        assert.ok(!el.classList.contains('active'));
        done();
      }, 50);
    }, 50);

  });

  it('should set the panelOpenState to false on swipe left', function() {
    assert.ok(!model.get('panelOpenState'));
    model.set('panelOpenState', true);
    assert.ok(model.get('panelOpenState'));
    appEvents.trigger('ui:swipeleft', { target: el });
    assert.ok(!model.get('panelOpenState'));
  });

});
