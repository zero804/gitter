/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert       = require('assert');
var Backbone     = require('backbone');
var RoomItemView = require('public/js/views/menu/room/minibar/minibar-item-view');

describe('MinibarItemView', function() {

  var el;
  var model;
  var innerEl;
  var roomItemView;
  var close;
  var container;
  var closeButtonView;
  var closeModel;

  beforeEach(function() {

    el = document.createElement('div');
    el.dataset.stateChange = 'people';
    el.dataset.orgName = 'someorg';

    model = new Backbone.Model({ type: 'people' });

    roomItemView = new RoomItemView({
      el:        el,
      model:     model,
      bus:       Backbone.Events,
      dndCtrl:   new Backbone.View(),
      menuModel: new Backbone.Model(),
    });

    container = document.createElement('div');
    close = document.createElement('div');
    close.id = 'menu-close-button';
    container.appendChild(close);
    closeModel = new Backbone.Model();
    closeButtonView = new RoomItemView({
      el:        container,
      menuModel: closeModel,
      bus:       Backbone.Events,
      dndCtrl:   new Backbone.View(),
    });

  });

  it('should create a model if one is not passed', function() {
    var view = new RoomItemView({ bus: Backbone.Events, dndCtrl: new Backbone.View(), menuModel: new Backbone.Model() });
    assert.ok(view.model instanceof Backbone.Model);
  });

  it('should set the correct attributes on the model', function() {
    assert.equal(roomItemView.model.get('type'), 'people');
    assert.equal(roomItemView.model.get('orgName'), 'someorg');
  });

  it('should throw an error if no bus is passed', function(done) {
    try { new RoomItemView(); }
    catch (e) {
      assert.equal(e.message, 'A valid event bus must be passed to a new instance of MiniBarItemView');
      done();
    }
  });

  it('should throw an error id no drag & drop controller is passed', function(done) {
    try { new RoomItemView({ bus: Backbone.Events }); }
    catch (e) {
      assert.equal(e.message, 'A valid drag & drop controller must be passed to a new instance of MiniBarItemView');
      done();
    }
  });

  it('should throw an error if no menuModel is passed', function(done) {
    try { new RoomItemView({ bus: Backbone.Events, dndCtrl: new Backbone.View() });}
    catch (e) {
      assert.equal(e.message, 'A valid roomMenuModel must be passed to a new instance of MiniBarItemView');
      done();
    }
  });

  it('should trigger an event when it\'s el is clicked', function(done) {
    roomItemView.on('room-item-view:clicked', function() {
      assert.ok(true);
      done();
    });

    el.click();
  });

  it('trigger an event when it\'s el is swiped', function(done) {
    roomItemView.on('room-item-view:clicked', function() {
      assert.ok(true);
      done();
    });

    Backbone.Events.trigger('ui:swiperight', { target: el });
  });

  it('should pass the right data with the event', function(done) {
    roomItemView.on('room-item-view:clicked', function(state, orgName) {
      assert.equal('people', state);
      assert.equal('someorg', orgName);
      done();
    });

    el.click();
  });

  it('should add an active class to it\'s el on model change', function() {
    assert.ok(!el.classList.contains('active'));
    roomItemView.model.set('active', true);
    assert.ok(el.classList.contains('active'));
    roomItemView.model.set('active', false);
    assert.ok(!el.classList.contains('active'));
  });

  it('should assign the correct property to its model if it contains a close button', function() {
    assert.ok(closeButtonView.model.get('isCloseButton'));
    assert.ok(!roomItemView.model.get('isCloseBubtton'));
  });

  it('should send isCloseButton when its el is clicked', function(done) {
    closeButtonView.on('room-item-view:clicked', function(type, name, isCloseButton) {
      assert.ok(isCloseButton);
      done();
    });

    container.click();
  });

  it('should assign a debounceTime', function() {
    assert.ok(closeButtonView.debounceTime);
  });

  it('should assign a "left" class when the room is pinned and the panel is open', function(done) {
    closeButtonView.menuModel.set({ roomMenuIsPinned: true, panelOpenState: true });
    setTimeout(function() {
      assert.ok(closeButtonView.el.classList.contains('left'));
      assert.ok(!closeButtonView.el.classList.contains('right'));
      done();
    }, closeButtonView.debounceTime);
  });

  it('should assign a right class when the room is not pinned and the menu is open', function(done) {
    closeButtonView.menuModel.set({ roomMenuIsPinned: false, panelOpenState: true });
    setTimeout(function() {
      assert.ok(!closeButtonView.el.classList.contains('left'));
      assert.ok(closeButtonView.el.classList.contains('right'));
      done();
    }, closeButtonView.debounceTime);
  });

  it('should remove both left & right classes when the menu is closed', function(done) {
    closeButtonView.menuModel.set({ panelOpenState: false });
    setTimeout(function() {
      assert.ok(!closeButtonView.el.classList.contains('left'));
      assert.ok(!closeButtonView.el.classList.contains('right'));
      done();
    }, closeButtonView.debounceTime);
  });

});
