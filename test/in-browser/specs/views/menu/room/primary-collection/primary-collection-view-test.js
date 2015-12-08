/*global describe:true, it:true, beforeEach:true */
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
    model = new Backbone.Model({ state: 'all' });
    collection = new Backbone.Collection();
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

});
