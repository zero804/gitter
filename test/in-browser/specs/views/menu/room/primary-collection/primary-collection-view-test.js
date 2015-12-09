/*global describe:true, it:true, beforeEach:true, sinon: true */
'use strict';

/*
 *  TODO TEST VIEW FILTERING FOR DIFFERENT MODEL STATES
 * */

var assert                = require('assert');
var Backbone              = require('backbone');
var PrimaryCollectionView = require('public/js/views/menu/room/primary-collection/primary-collection-view');

describe('PrimaryCollectionView', function() {

  var collection;
  var model;
  var el;
  var primaryCollectionView;

  beforeEach(function() {
    el = document.createElement('div');
    model = new Backbone.Model({ state: 'all', panelOpenState: true });
    collection = new Backbone.Collection([
      { name:  '1' },
      { name:  '2' },
      { name:  '3' },
      { name:  '4' },
    ]);
    primaryCollectionView = new PrimaryCollectionView({
      el: el,
      model: model,
      collection: collection,
      bus: Backbone.Events,
    });
  });

  it('should throw an error if no buss is passed on init', function(done) {
    try {
      new PrimaryCollectionView({
        el: el,
        model: model,
        collection: collection,
      });
    }
    catch (e) {
      assert.equal(e.message, 'A valid event bus must be passed to a new PrimaryCollectionView');
      done();
    }
  });

  //Sadly as we are using request animation frame some checks must be wrapped
  //in timeouts ... yuck jp 8/12/15
  it('should add a class to its element when its model is in a search state', function(done) {
    model.set('state', 'search');
    assert.ok(!el.classList.contains('active'));
    model.set('state', 'all');
    assert.ok(el.classList.contains('active'));
    done();
  });

  it('should render when the model changes state', function() {
    sinon.stub(primaryCollectionView, 'render');
    assert.equal(0, primaryCollectionView.render.callCount);
    model.set('state', 'search');
    assert.equal(1, primaryCollectionView.render.callCount);
  });

  it('should render when selectedOrgName is changed', function() {
    sinon.stub(primaryCollectionView, 'render');
    assert.equal(0, primaryCollectionView.render.callCount);
    model.set('selectedOrgName', 'troupe');
    assert.equal(1, primaryCollectionView.render.callCount);
  });

  it('should call onItemClicked when a child is clicked', function() {
    sinon.stub(primaryCollectionView, 'onItemClicked');
    primaryCollectionView.render();
    el.firstChild.click();
    assert.equal(1, primaryCollectionView.onItemClicked.callCount);
  });

  it('should change the models panelOpenState when clicked', function() {
    assert.ok(model.get('panelOpenState'));
    primaryCollectionView.render();
    el.firstChild.click();
    assert.ok(!model.get('panelOpenState'));
  });

  it('should not change the models panelOpenState when the roomMenuIsPinned', function(){
    model.set('roomMenuIsPinned', true);
    assert.ok(model.get('panelOpenState'));
    primaryCollectionView.render();
    el.firstChild.click();
    assert.ok(model.get('panelOpenState'));
  });

  it('should emit a navigation event when an item is clicked', function(done) {
    primaryCollectionView.render();
    Backbone.Events.on('navigation', function(url, type, title) {
      assert.equal('/1', url);
      assert.equal('chat', type);
      assert.equal('1', title);
      done();
    });

    el.firstChild.click();
  });

});
