/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert      = require('assert');
var Backbone    = require('backbone');
var MiniBarView = require('public/js/views/menu/room/minibar/minibar-view');

describe('MinibarView', function() {

  var miniBar;
  var el;
  var innerEl;
  var innerEl2;
  var innerEl3;
  var model;

  beforeEach(function() {

    el = document.createElement('div');

    innerEl = document.createElement('div');
    innerEl.dataset.stateChange = 'people';
    innerEl.dataset.roomId = 1;
    el.appendChild(innerEl);

    innerEl2 = document.createElement('div');
    innerEl2.dataset.stateChange = 'search';
    innerEl2.dataset.roomId = 2;
    el.appendChild(innerEl2);

    innerEl3 = document.createElement('div');
    innerEl3.dataset.stateChange = 'org';
    innerEl3.dataset.roomId = 3;
    el.appendChild(innerEl3);


    model = new Backbone.Model({
      panelOpenState: false,
      state: 'all',
      profileMenuOpenState: false,
    });

    miniBar = new MiniBarView({ el: el, model: model });
  });

  it('should set the correct model attributes when a click is triggered', function() {
    assert.ok(!model.get('panelOpenState'));
    assert.equal('all', model.get('state'));
    assert.ok(!model.get('profileMenuOpenState'));

    miniBar.roomMenuItems[0].trigger('room-item-view:clicked', 'search');

    assert.ok(model.get('panelOpenState'));
    assert.equal('search', model.get('state'));
    assert.ok(!model.get('profileMenuOpenState'));
  });

  it('should create child views for each child element with the correct dataset', function() {
    assert.equal(3, miniBar.roomMenuItems.length);
  });

  it('should create child models for each child element with the correct dataset', function() {
    assert.equal(3, miniBar.roomMenuItemModels.length);
  });

  it('should swap active models on click', function() {
    miniBar.roomMenuItems[1].trigger('room-item-view:clicked', 'search');
    assert.ok(!miniBar.roomMenuItemModels.at(0).get('active'));
    assert.ok(miniBar.roomMenuItemModels.at(1).get('active'));
  });

  it('should select an active model by orgId if one is passed', function() {
    miniBar.roomMenuItems[1].trigger('room-item-view:clicked', 'org', 3);
    console.log(miniBar.roomMenuItemModels);
    assert.ok(miniBar.roomMenuItemModels.at(2).get('active'));
    assert.ok(!miniBar.roomMenuItemModels.at(1).get('active'));
    miniBar.roomMenuItems[1].trigger('room-item-view:clicked', 'org', 2);
    assert.ok(miniBar.roomMenuItemModels.at(1).get('active'));
  });


  it('should remove all active models when panelOpenState changes to false', function() {
    miniBar.model.set('panelOpenState', true);
    miniBar.model.set('panelOpenState', false);
    assert.equal(0, miniBar.roomMenuItemModels.where({ active: true }));
  });

  it('should not throw an error if there is no currently active child model and the panelStateChanges', function(done) {
    try {
      //close the panel
      miniBar.model.set('panelOpenState', false);

      //try triggering a menu item clicked
      miniBar.roomMenuItems[1].trigger('room-item-view:clicked', 'search');
      done();
    }
    catch (e) {
      assert.ok(false,
                'an error was thrown whilst trying to click a menu item  after the panel has been closed');
      done();
    }
  });

});
