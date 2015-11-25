/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert    = require('assert');
var Backbone  = require('backbone');
var PanelView = require('../../../public/js/views/menu/panel-view');

describe('PanelView', function() {

  var model;
  var el;
  var panelView;

  beforeEach(function() {
    el        = document.createElement('div');
    model     = new Backbone.Model();
    panelView = new PanelView({ model: model, el: el });
  });

  it('should toggle a class on it\'s el when it\'s model changes', function() {

    assert.ok(!el.classList.contains('active'));

    model.set('panelOpenState', true);
    assert.ok(el.classList.contains('active'));

    model.set('panelOpenState', false);
    assert.ok(!el.classList.contains('active'));

  });

});
