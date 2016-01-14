/*global describe:true, it:true, beforeEach:true */
'use strict';

/*
 *  TODO TEST VIEW FILTERING FOR DIFFERENT MODEL STATES
 * */

var $                     = require('jquery');
var assert                = require('assert');
var sinon                 = require('sinon');
var Backbone              = require('backbone');
var PrimaryCollectionView = require('public/js/views/menu/room/primary-collection/primary-collection-view');
var context               = require('utils/context');

describe('PrimaryCollectionView', function() {

  var collection;
  var model;
  var el;
  var primaryCollectionView;
  var dndCtrl;

  beforeEach(function() {
    context.troupe().set('id', 1);
    el = document.createElement('div');
    model = new Backbone.Model({ state: 'all', panelOpenState: true, selectedOrgName: 'gitterHQ' });
    collection = new Backbone.Collection([
      { name:  '1', id: 1, favourite: 1, uri: '1' },
      { name:  '2', id: 2, uri: '2' },
      { name:  '3', id: 3, uri: '3' },
      { name:  '4', id: 4, uri: '4' },
    ]);
    sinon.stub(collection.models[1], 'save');

    dndCtrl = new Backbone.View();
    dndCtrl.pushContainer = function() {};

    primaryCollectionView = new PrimaryCollectionView({
      el:         el,
      model:      model,
      collection: collection,
      bus:        Backbone.Events,
      dndCtrl:    dndCtrl,
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
    $(el.firstChild).click();
    assert.equal(1, primaryCollectionView.onItemClicked.callCount);
  });

  it('should change the models panelOpenState when clicked', function() {
    assert.ok(model.get('panelOpenState'));
    primaryCollectionView.render();
    $(el.firstChild).click();
    assert.ok(!model.get('panelOpenState'));
  });

  it('should not change the models panelOpenState when the roomMenuIsPinned', function() {
    model.set('roomMenuIsPinned', true);
    assert.ok(model.get('panelOpenState'));
    primaryCollectionView.render();
    $(el.firstChild).click();
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

    $(el.firstChild).click();
  });

  it('should favourite a model on the correct event and save it', function() {
    var favModel = collection.get(2);
    dndCtrl.trigger('room-menu:add-favourite', 2);
    assert.equal(3, favModel.get('favourite'));
  });

  it('should favourite the model after its been saved', function() {
    var favModel = collection.get(2);
    dndCtrl.trigger('room-menu:add-favourite', 2);
    assert.equal(1, favModel.save.callCount);
  });

  it('should throw an error when filter is called in the org state with no selectedOrgName', function(done) {
    try {
      primaryCollectionView.model.set('state', 'org');
      primaryCollectionView.model.set('selectedOrgName', '');
      primaryCollectionView.filter(new Backbone.Model());
    }
    catch (e) {
      assert.equal(e.message, 'Room Menu Model is in the org state with no selectedOrgName');
      done();
    }
  });

  it('should filter favourites when the room model is in the favourite state', function() {
    primaryCollectionView.model.set('state', 'favourite');
    assert(primaryCollectionView.filter(new Backbone.Model({ favourite: true })));
    assert(!primaryCollectionView.filter(new Backbone.Model({ favourite: false })));
  });

  it('should filter by github type when in the people state', function() {
    primaryCollectionView.model.set('state', 'people');
    assert(primaryCollectionView.filter(new Backbone.Model({ githubType: 'ONETOONE' })));
    assert(!primaryCollectionView.filter(new Backbone.Model({ githubType: 'REPO' })));
  });

  it('should select the correct model on init', function() {
    assert.equal(1, primaryCollectionView.collection.where({ selected: true })[0].get('id'));
  });

  it('should only have selected one model when the troupe model changes id', function() {
    assert.equal(1, primaryCollectionView.collection.where({ selected: true }).length);
    context.troupe().set('id', 2);
    assert.equal(1, primaryCollectionView.collection.where({ selected: true }).length);
  });

  it('should update the selected model when the troupe model changes', function() {
    assert.equal(1, primaryCollectionView.collection.where({ selected: true })[0].get('id'));
    context.troupe().set('id', 2);
    assert.equal(2, primaryCollectionView.collection.where({ selected: true })[0].get('id'));
  });

  it('should focus the first element of its collection when keyboard focus is triggered', function() {
    assert.equal(0, primaryCollectionView.collection.where({ focus: true }));
    primaryCollectionView.bus.trigger('room-menu:keyboard:focus');
    assert(primaryCollectionView.collection.at(0).get('focus'));
  });

  it('should generate a uiModel', function() {
    assert(primaryCollectionView.uiModel);
    assert(!primaryCollectionView.uiModel.get('isFocused'));
  });

  it('should set isFocused after a keyboard focus event', function() {
    assert(!primaryCollectionView.uiModel.get('isFocused'));
    primaryCollectionView.bus.trigger('room-menu:keyboard:focus');
    assert(primaryCollectionView.uiModel.get('isFocused'));
  });

  it('should select the next item in the collection when keyboard down is pressed', function() {
    primaryCollectionView.bus.trigger('room-menu:keyboard:focus');
    primaryCollectionView.bus.trigger('keyboard.room.down');
    assert(!primaryCollectionView.collection.at(0).get('focus'));
    assert(primaryCollectionView.collection.at(1).get('focus'));
  });

  it('should select the previous item in the collection when keyboard up is pressed', function() {
    primaryCollectionView.bus.trigger('room-menu:keyboard:focus');
    primaryCollectionView.bus.trigger('keyboard.room.down');
    primaryCollectionView.bus.trigger('keyboard.room.up');
    assert(primaryCollectionView.collection.at(0).get('focus'));
    assert(!primaryCollectionView.collection.at(1).get('focus'));
  });

  it('should emit an event on keyboard up movement', function(done) {
    primaryCollectionView.bus.on('room-menu:keyboard:select-last', function(id) {
      assert(true);
      done();
    });

    primaryCollectionView.bus.trigger('room-menu:keyboard:focus');
    assert(primaryCollectionView.collection.at(0).get('focus'));
    primaryCollectionView.bus.trigger('keyboard.room.up');
  });

  it('should emit an event on keyboard up movement', function(done) {
    primaryCollectionView.bus.on('room-menu:keyboard:select-last', function(id) {
      assert(true);
      done();
    });

    primaryCollectionView.bus.trigger('room-menu:keyboard:focus');
    assert(primaryCollectionView.collection.at(0).get('focus'));
    primaryCollectionView.bus.trigger('keyboard.room.down');
  });

});
