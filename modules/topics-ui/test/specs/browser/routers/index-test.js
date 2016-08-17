"use strict";

var assert = require('assert');
var Backbone = require('backbone');
var sinon = require('sinon');
var router = require('../../../../browser/js/routers/index');
var sinon = require('sinon');
var {dispatch, subscribe} = require('../../../../browser/js/dispatcher');
var navConstants = require('../../../../browser/js/constants/navigation.js');
var forumCatConstants = require('../../../../browser/js/constants/forum-categories');
var forumFilterConstants = require('../../../../browser/js/constants/forum-filters');
var forumTagConstants = require('../../../../browser/js/constants/forum-tags');
var forumSortConstants = require('../../../../browser/js/constants/forum-sorts');

describe('Router', function(){

  const trigger = {trigger: true};
  let filterHandle;
  let sortHandle;

  beforeEach(function(){
    window.location.hash = 'gitterHQ/topics';
    filterHandle = sinon.spy();
    sortHandle = sinon.spy();
    Backbone.history.start({
      pushState: false,
    });
  });

  afterEach(function(){
    window.location.hash = '';
    Backbone.history.stop();
  });

  it('should start with the right default route', function(){
    assert.equal(router.get('route'), 'forum');
  });

  it('should have the right inital groupName', function(){
    assert.equal(router.get('groupName'), 'gitterHQ');
  });

  it('should have the right inital categoryName', function(){
    assert.equal(router.get('categoryName'), 'all');
  });

  it('should have the right filter on url change', function(){
    assert.equal(router.get('categoryName'), 'all');
    Backbone.history.navigate('gitterHQ/topics/categories/activity', trigger);
    assert.equal(router.get('categoryName'), 'activity');
  });

  it('should set the right state after dispatching a forum navigate action', function(){
    dispatch({type: forumCatConstants.NAVIGATE_TO_CATEGORY, route: 'forum', category: 'test'});
    assert.equal(router.get('categoryName'), 'test');
    assert.equal(router.get('route'), 'forum');
  });

  it('should set the right state after dispatching a forum filter action', () => {
    dispatch({type: forumFilterConstants.NAVIGATE_TO_FILTER, route: 'forum', filter: 'test'});
    assert.equal(router.get('filterName'), 'test');
    assert.equal(router.get('route'), 'forum');
  });

  it('should set the right state after dispatching a forum tag action', () => {
    dispatch({type: forumTagConstants.NAVIGATE_TO_TAG, route: 'forum', tag: 'test'});
    assert.equal(router.get('tagName'), 'test');
    assert.equal(router.get('route'), 'forum');
  });

  it('should set the right state after dispatching a forum sort action', () => {
    dispatch({type: forumSortConstants.NAVIGATE_TO_SORT, route: 'forum', sort: 'test'});
    assert.equal(router.get('sortName'), 'test');
    assert.equal(router.get('route'), 'forum');
  });

  it('should dispacth the right event when the filter property updates', () => {
    router.on(forumFilterConstants.UPDATE_ACTIVE_FILTER, filterHandle);
    router.set('filterName', 'test');
    assert.equal(filterHandle.callCount, 1);
  });

  it('should dispacth the right event when the sort property updates', () => {
    router.on(forumSortConstants.UPDATE_ACTIVE_SORT, sortHandle);
    router.set('sortName', 'test');
    assert.equal(sortHandle.callCount, 1);
  });


});
