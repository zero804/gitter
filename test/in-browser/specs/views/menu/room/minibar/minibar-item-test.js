/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert       = require('assert');
var Backbone     = require('backbone');
var RoomItemView = require('public/js/views/menu/room/minibar/minibar-item-view');
var appEvents    = require('utils/appevents');

describe('MinibarItemView', function() {

  var el;
  var model;
  var innerEl;
  var roomItemView;

  beforeEach(function() {

    el = document.createElement('div');
    el.dataset.stateChange = 'people';
    el.dataset.orgName = 'someorg';

    model = new Backbone.Model({ type: 'people' });

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

    roomItemView.on('room-item-view:clicked', function(state, orgName) {
      assert.equal('people', state);
      assert.equal('someorg', orgName);
      done();
    });

    el.click();
  });

  //Sadly as we are using request animation frame some checks must be wrapped
  //in timeouts ... yuck jp 8/12/15
  it('should add an active class to it\'s el on model change', function(){
    assert.ok(!el.classList.contains('active'));
    roomItemView.model.set('active', true);
    setTimeout(function(){
      assert.ok(el.classList.contains('active'));
      roomItemView.model.set('active', false);
      setTimeout(function(){
        assert.ok(!el.classList.contains('active'));
      });
    });
  });


});
