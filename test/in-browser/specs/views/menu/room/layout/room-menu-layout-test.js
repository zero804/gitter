/*global describe:true, it:true, beforeEach:true */
'use strict';

var $                  = require('jquery');
var assert             = require('assert');
var Backbone           = require('backbone');
var MenuLayout         = require('public/js/views/menu/room/layout/room-menu-layout');
var RoomMenuModel      = require('public/js/models/room-menu-model');
var MockRoomCollection = require('fixtures/helpers/room-collection');

describe('MenuLayout', function() {

  var menuLayout;
  var roomCollection;
  var el;

  beforeEach(function() {

    el = document.createElement('div');
    roomCollection = new MockRoomCollection();

    menuLayout = new MenuLayout({
      bus: Backbone.Events,
      roomCollection: roomCollection,
      el: el,
    });

  });

  it('should create a room menu model on init', function() {
    assert.ok(menuLayout.model instanceof RoomMenuModel);
  });

  it('should open the panel onMouseEnter when the roomMenu is not pinned', function() {
    menuLayout.model.set('roomMenuIsPinned', false);
    $(el).mouseenter();
    assert.ok(menuLayout.model.get('panelOpenState'));
  });

  it('should not open the panel onMouseEnter when the roomMenu is pinned', function() {
    menuLayout.model.set('roomMenuIsPinned', true);
    menuLayout.model.set('panelOpenState', false);
    $(el).mouseenter();
    assert.ok(!menuLayout.model.get('panelOpenState'));
  });

  it('should not change the panelOpenState on mouseLeave if the menu is pinned', function(done) {
    menuLayout.model.set('roomMenuIsPinned', true);
    menuLayout.model.set('panelOpenState', true);
    menuLayout.delay = 0;
    $(el).mouseleave();
    setTimeout(function() {
      assert.ok(menuLayout.model.get('panelOpenState'));
      done();
    }, 1);
  });

  it('should change the panelOpenState on mouseLeave if the menu is not pinned', function(done) {
    menuLayout.model.set('roomMenuIsPinned', false);
    menuLayout.model.set('panelOpenState', true);
    menuLayout.delay = 0;
    $(el).mouseleave();
    setTimeout(function() {
      assert.ok(!menuLayout.model.get('panelOpenState'));
      done();
    }, 1);
  });

  it('should set menuWasPinned correctly on dragStart', function(){
    menuLayout.model.set('roomMenuIsPinned', false);
    menuLayout.dndCtrl.trigger('dnd:start-drag');
    assert.ok(!menuLayout.model.get('roomMenuWasPinned'));
    menuLayout.model.set('roomMenuIsPinned', true);
    menuLayout.dndCtrl.trigger('dnd:start-drag');
    assert.ok(menuLayout.model.get('roomMenuWasPinned'));
  });

  it('should set roomMenuIsPinned on dragStart', function(){
    menuLayout.model.set('roomMenuIsPinned', false);
    menuLayout.dndCtrl.trigger('dnd:start-drag');
    assert.ok(menuLayout.model.get('roomMenuIsPinned'));
  });

  it('should set roomMenuIsPinned if the roomMenu was not pinned on dragEnd', function(){
    menuLayout.model.set('roomMenuWasPinned', false);
    menuLayout.model.set('roomMenuIsPinned', true);
    menuLayout.dndCtrl.trigger('dnd:end-drag');
    assert.ok(!menuLayout.model.get('roomMenuIsPinned'));
  });

  it('should open the panel on drag end', function(){
    menuLayout.model.set('panelOpenState', false);
    menuLayout.dndCtrl.trigger('dnd:end-drag');
    assert(menuLayout.model.get('panelOpenState'));
  });

});
