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
      el: el,
      model: model,
      bus: Backbone.Events
    });

    container = document.createElement('div');
    close = document.createElement('div');
    close.id = 'menu-close-button';
    container.appendChild(close);
    closeModel = new Backbone.Model();
    closeButtonView = new RoomItemView({ el: container, model:  closeModel });
  });

  it('trigger an event when it\'s el is clicked', function(done) {

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

  it('should send isCloseButton when its el is clicked', function(done){
    closeButtonView.on('room-item-view:clicked', function(type, name, isCloseButton){
      assert.ok(isCloseButton);
      done();
    });
    container.click();
  });

  it('should assign the correct directional class onPanelStateChange (if its a close button)', function(){
    closeModel.set({ roomMenuIsPinned: true, panelOpenState: true });
  });

});
