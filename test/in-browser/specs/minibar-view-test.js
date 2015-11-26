/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert      = require('assert');
var Backbone    = require('backbone');
var MiniBarView = require('../../../public/js/views/menu/minibar-view');

describe('MinibarView', function() {

  var miniBar;
  var el;
  var innerEl;
  var innerEl2;
  var model;

  beforeEach(function() {

    el = document.createElement('div');

    innerEl = document.createElement('div');
    innerEl.dataset.stateChange = 'people';
    el.appendChild(innerEl);

    innerEl2 = document.createElement('div');
    innerEl2.dataset.stateChange = 'search';
    el.appendChild(innerEl2);

    model = new Backbone.Model({ panelOpenState: true });

    miniBar = new MiniBarView({ el: el, model: model });
  });

  it('should emit an event when its element is clicked', function(done) {

    miniBar.on('minibar:clicked', function() {
      assert.ok(true);
      done();
    });

    innerEl.click();

  });

  it('should create child views for each child element with the correct dataset', function() {
    assert.equal(2, miniBar.roomMenuItems.length);
  });

  it('should create child models for each child element with the correct dataset', function() {
    assert.equal(2, miniBar.roomMenuItemModels.length);
  });

  it('should swap active models on click', function() {
    miniBar.roomMenuItems[1].trigger('room-item-view:clicked', 'search');
    assert.ok(!miniBar.roomMenuItemModels.at(0).get('active'));
    assert.ok(miniBar.roomMenuItemModels.at(1).get('active'));
  });

  it.only('should remove all active models when panelOpenState changes to false', function(){
    miniBar.model.set('panelOpenState', false);
    assert.equal(0, miniBar.roomMenuItemModels.where({ active: true }));
  });

});
