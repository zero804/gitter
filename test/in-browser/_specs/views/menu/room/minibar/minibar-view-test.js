/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
var Backbone = require('backbone');
var MiniBarView = require('public/js/views/menu/room/minibar/minibar-view');
var appEvents = require('utils/appevents');

describe.skip('MinibarView', function() {

  var miniBar;
  var el;
  var innerEl;
  var innerEl2;
  var innerEl3;
  var model;
  var closeBtn;

  beforeEach(function() {

    el = document.createElement('div');

    innerEl = document.createElement('div');
    innerEl.dataset.stateChange = 'people';
    innerEl.dataset.orgName = 'test1';
    el.appendChild(innerEl);

    innerEl2 = document.createElement('div');
    innerEl2.dataset.stateChange = 'search';
    innerEl2.dataset.orgName = 'test2';
    el.appendChild(innerEl2);

    innerEl3 = document.createElement('div');
    innerEl3.dataset.stateChange = 'org';
    innerEl3.dataset.orgName = 'test3';
    el.appendChild(innerEl3);

    closeBtn = document.createElement('div');
    closeBtn.id = 'menu-toggle-button';
    innerEl3.appendChild(closeBtn);

    model = new Backbone.Model({
      panelOpenState: false,
      state: 'all',
      profileMenuOpenState: false,
    });

    miniBar = new MiniBarView({
      el:      el,
      model:   model,
      bus:     Backbone.Events,
      dndCtrl: new Backbone.View(),
    });

  });

  it('should throw an error if no bus is passed', function(done) {
    try { new MiniBarView(); }
    catch (e) {
      assert.equal(e.message, 'A valid event bus must be passed to a new instance of the MiniBarView');
      done();
    }
  });

  it('should throw an error if no drag & drop controller is passed', function(done) {
    try { new MiniBarView({ bus: Backbone.Events });}
    catch (e) {
      assert.equal(e.message, 'A valid drag & drop controller must be passed to a new instance of the MiniBarView');
      done();
    }
  });

  it('should create roomMenuItems and roomMenuItemModles', function() {
    assert.ok(miniBar.roomMenuItems instanceof Array);
    assert.ok(miniBar.roomMenuItemModels instanceof Backbone.Collection);
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

  it('should return an active model the _getCurrentlyActiveChildModel is called', function() {
    assert.ok(miniBar._getCurrentlyActiveChildModel() instanceof Backbone.Model);
  });

  it('should swap active models on click', function() {
    miniBar.roomMenuItems[1].trigger('room-item-view:clicked', 'search');
    assert.ok(!miniBar.roomMenuItemModels.at(0).get('active'));
    assert.ok(miniBar.roomMenuItemModels.at(1).get('active'));
  });

  it('should select an active model by orgName if one is passed', function() {
    miniBar.roomMenuItems[1].trigger('room-item-view:clicked', 'org', 'test3');
    assert.ok(miniBar.roomMenuItemModels.at(2).get('active'));
    assert.ok(!miniBar.roomMenuItemModels.at(1).get('active'));
    miniBar.roomMenuItems[1].trigger('room-item-view:clicked', 'org', 'test2');
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

  it('should stop listening to child views when destroyed', function() {
    miniBar.destroy();
    miniBar.roomMenuItems[1].trigger('room-item-view:clicked', 'org', 'test2');
    assert.ok(!miniBar.roomMenuItemModels.at(1).get('active'));
  });

  it('should change the roomMenuIsPinned when the close button is clicked', function() {
    miniBar.model.set('roomMenuIsPinned', true);
    miniBar.$el.find('#menu-toggle-button').click();
    assert.ok(!miniBar.model.get('roomMenuIsPinned'));
  });

  it('should open the panel and focus the correct child on key press', function() {
    miniBar.model.set({ panelOpenState: false, profileMenuOpenState: true });
    appEvents.trigger('keyboard.room.1', null, { key: 'ctrl+alt+1' });
    assert(miniBar.model.get('panelOpenState'));
    assert(!miniBar.model.get('profileMenuOpenState'));
    assert(miniBar.roomMenuItemModels.at(0).get('active'));
    appEvents.trigger('keyboard.room.1', null, { key: 'ctrl+alt+2' });
    assert(miniBar.roomMenuItemModels.at(1).get('active'));
  });

  it('should emit an event when a keyboad event is triggered', function(done) {
    appEvents.on('room-menu:keyboard:focus', function() {
      assert.ok(true);
      done();
    });

    appEvents.trigger('keyboard.room.1', null, { key: 'ctrl+alt+1' });
  });

  it('should emit an focus.request.out event when a keyboad event is triggered', function(done) {
    appEvents.on('focus.request.out', function() {
      assert.ok(true);
      done();
    });

    appEvents.trigger('keyboard.room.1', null, { key: 'ctrl+alt+1' });
  });

});
