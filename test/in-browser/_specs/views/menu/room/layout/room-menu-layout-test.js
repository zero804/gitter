/*global describe:true, it:true, beforeEach:true, afterEach: true */
'use strict';

var $ = require('jquery');
var assert = require('assert');
var Backbone = require('backbone');
var MenuLayout = require('public/js/views/menu/room/layout/room-menu-layout');
var RoomMenuModel = require('public/js/models/room-menu-model');
var MockRoomCollection = require('fixtures/helpers/room-collection');

describe('MenuLayout', function() {

  var menuLayout;
  var roomCollection;
  var el;

  beforeEach(function() {

    el = document.createElement('div');
    roomCollection = new MockRoomCollection();

    //TODO TEST WITH MOCK ORG COLLECTION JP 25/1/16
    menuLayout = new MenuLayout({
      bus:            Backbone.Events,
      roomCollection: roomCollection,
      el:             el,
    });

  });

  afterEach(function(){
    $('body').removeClass('mobile');
    $('body').removeClass('desktop');
  });

  it('should throw an error if no bus is passed', function(done){
    try{ new MenuLayout(); }
    catch(e) {
      assert.equal(e.message, 'A valid event bus needs to be passed to a new instance of RoomMenuLayout');
      done();
    }
  });

  it('should throw an error if no roomCollection is passed', function(done){
    try{ new MenuLayout({ bus: Backbone.Events }); }
    catch(e) {
      assert.equal(e.message, 'A valid room collection needs to be passed to a new instance of RoomMenyLayout');
      done();
    }
  });

  it('should assign a delay', function(){
    assert.ok(menuLayout.delay);
  });

  it('should create a room menu model on init', function() {
    assert.ok(menuLayout.model instanceof RoomMenuModel);
  });

  it('should create a room menu model with a user object', function(){
    assert.ok(menuLayout.model.get('userModel') instanceof Backbone.Model);
  });

  it('should make a new drag & drop controller', function(){
      assert.ok(menuLayout.dndCtrl);
  });

  it('should assign isMobile correctly depending on the body.class', function(){
    $('body').addClass('mobile');
    menuLayout = new MenuLayout({
      bus:            Backbone.Events,
      roomCollection: roomCollection,
      el:             el,
    });
    assert.ok(menuLayout.model.get('isMobile'));
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

  it('should set menuWasPinned correctly on dragStart', function() {
    menuLayout.model.set('roomMenuIsPinned', false);
    menuLayout.dndCtrl.trigger('dnd:start-drag');
    assert.ok(!menuLayout.model.get('roomMenuWasPinned'));
    menuLayout.model.set('roomMenuIsPinned', true);
    menuLayout.dndCtrl.trigger('dnd:start-drag');
    assert.ok(menuLayout.model.get('roomMenuWasPinned'));
  });

  it('should set roomMenuIsPinned on dragStart', function() {
    menuLayout.model.set('roomMenuIsPinned', false);
    menuLayout.dndCtrl.trigger('dnd:start-drag');
    assert.ok(menuLayout.model.get('roomMenuIsPinned'));
  });

  it('should set roomMenuIsPinned if the roomMenu was not pinned on dragEnd', function() {
    menuLayout.model.set('roomMenuWasPinned', false);
    menuLayout.model.set('roomMenuIsPinned', true);
    menuLayout.dndCtrl.trigger('dnd:end-drag');
    assert.ok(!menuLayout.model.get('roomMenuIsPinned'));
  });

  it('should open the panel on drag end', function() {
    menuLayout.model.set('panelOpenState', false);
    menuLayout.dndCtrl.trigger('dnd:end-drag');
    assert(menuLayout.model.get('panelOpenState'));
  });

});
