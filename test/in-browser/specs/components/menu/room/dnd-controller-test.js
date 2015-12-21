/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert   = require('assert');
var Backbone = require('backbone');
var DNDCtrl  = require('public/js/components/menu/room/dnd-controller');

describe('DNDCtrl', function(){

  var dndCtrl;
  var model;

  beforeEach(function(){
    model = new Backbone.Model();
    dndCtrl = new DNDCtrl({ model: model });
  });

  it('should throw an error if no model is passed on init', function(){
    try { new DNDCtrl(); }
    catch(e) {
      assert.equal(e.message,
                   'A valid model must be passed to a new instance of the DNDController');
    }
  });

  it('should contain a drag object', function(){
    assert.ok(dndCtrl.drag);
  });

  it('its shouldCopyDraggedItem function should return true when the model is not in a favourite state', function(){
    model.set('state', 'all');
    assert.ok(dndCtrl.shouldCopyDraggedItem());
    model.set('state', 'favourite');
    assert.ok(!dndCtrl.shouldCopyDraggedItem());
  });

  it('its shouldMoveItem should return true for everything other than an anchor', function(){
    assert.ok(dndCtrl.shouldItemMove(document.createElement('div')));
    assert.ok(!dndCtrl.shouldItemMove(document.createElement('a')));
  });

  it('should push containers onto its drag object', function(){
    dndCtrl.pushContainer(document.createElement('div'));
    assert.equal(1, dndCtrl.drag.containers.length);
  });

  it('should contain on/off/trigger methods', function(){
    assert.ok(dndCtrl.on);
    assert.ok(dndCtrl.off);
    assert.ok(dndCtrl.trigger);
  });

  it('should trigger an event when onItemDropped is called with the right target', function(done){

    dndCtrl.on('room-menu:add-favourite', function(id){
      assert.equal(1, id);
      done();
    });

    model.set('state', 'all');
    var target = document.createElement('div');
    target.dataset.stateChange = 'favourite';

    var el = document.createElement('div');
    el.dataset.roomId = 1;

    dndCtrl.onItemDropped(el, target);
  });

  it('should trigger a different event with the wrong target', function(done){
     dndCtrl.on('room-menu:sort-favourite', function(id){
      assert.ok(true);
      done();
    });

    var el = document.createElement('div');
    var el2 = document.createElement('div');
    dndCtrl.onItemDropped(el2, el);

  });

});
