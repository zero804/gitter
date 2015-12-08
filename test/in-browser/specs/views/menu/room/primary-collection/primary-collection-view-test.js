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
    });
  });

  //Sadly as we are using request animation frame some checks must be wrapped
  //in timeouts ... yuck jp 8/12/15
  it('should add a class to its element when its model is in a search state', function(done) {
    model.set('state', 'search');
    setTimeout(function(){
      assert.ok(!el.classList.contains('active'));
      model.set('state', 'all');
      setTimeout(function(){
        assert.ok(el.classList.contains('active'));
        done();
      }, 50);
    }, 50);
  });

  it('should render when the model changes state', function(){
    sinon.stub(primaryCollectionView, 'render');
    assert.equal(0, primaryCollectionView.render.callCount);
    model.set('state', 'search');
    assert.equal(1, primaryCollectionView.render.callCount);
  });

  it('should render when selectedOrgName is changed', function(){
    sinon.stub(primaryCollectionView, 'render');
    assert.equal(0, primaryCollectionView.render.callCount);
    model.set('selectedOrgName', 'troupe');
    assert.equal(1, primaryCollectionView.render.callCount);
  });

  it('should call onItemClicked when a child is clicked', function(){
    sinon.stub(primaryCollectionView, 'onItemClicked');
    primaryCollectionView.render();
    el.firstChild.click();
    assert.equal(1, primaryCollectionView.onItemClicked.callCount);
  });

  it('should change the models panelOpenState when clicked', function(){
    assert.ok(model.get('panelOpenState'));
    primaryCollectionView.render();
    el.firstChild.click();
    assert.ok(!model.get('panelOpenState'));
  });

});
