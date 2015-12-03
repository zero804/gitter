/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert       = require('assert');
var Backbone     = require('backbone');
var RoomItemView = require('public/js/views/menu/room/minibar/minibar-item-view');
var appEvents    = require('utils/appevents');

describe('RoomMenuItemView', function() {

  var el;
  var model;
  var innerEl;
  var roomItemView;

  beforeEach(function() {

    el = document.createElement('div');
    el.dataset.stateChange = 'people';

    model = new Backbone.Model();

    roomItemView = new RoomItemView({ el: el, model: model });
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

    appEvents.trigger('ui:swiperight', { target: el });
  });

  it('should pass the right data with the event', function(done) {

    roomItemView.on('room-item-view:clicked', function(data) {
      assert.equal('people', data);
      done();
    });

    el.click();
  });

  it('should add an active class to it\'s el on model change', function(){
    assert.ok(!el.classList.contains('active'));

    roomItemView.model.set('active', true);
    assert.ok(el.classList.contains('active'));

    roomItemView.model.set('active', false);
    assert.ok(!el.classList.contains('active'));
  });


});
