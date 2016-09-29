import assert from 'assert';
import Backbone from 'backbone';
import router from '../../../../browser/js/routers/index';
import sinon from 'sinon';
import { dispatch } from '../../../../shared/dispatcher';

import * as forumCatConstants from '../../../../shared/constants/forum-categories';
import * as forumFilterConstants from '../../../../shared/constants/forum-filters';
import * as forumTagConstants from '../../../../shared/constants/forum-tags';
import * as forumSortConstants from '../../../../shared/constants/forum-sorts';
import * as navConstants from '../../../../shared/constants/navigation';

import navigateToTopic from '../../../../shared/action-creators/topic/navigate-to-topic';
import navigateToCreateTopic from '../../../../shared/action-creators/create-topic/navigate-to-create-topic';
import navigateToCategory from '../../../../shared/action-creators/forum/navigate-to-category';

import currentUserStore from '../../../../browser/js/stores/current-user-store';

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

    // For mocking the user is signed in
    currentUserStore.set({
      id: '123'
    })
  });

  afterEach(function(){
    window.location.hash = '';
    Backbone.history.stop();
  });

  it('should start with the right default route', function(){
    assert.equal(router.get('route'), navConstants.FORUM_ROUTE);
  });

  it('should have the right inital groupUri', function(){
    assert.equal(router.get('groupUri'), 'gitterHQ');
  });

  it('should have the right inital categoryName', function(){
    assert.equal(router.get('categoryName'), navConstants.DEFAULT_CATEGORY_NAME);
  });

  it('should have the right filter on url change', function(){
    assert.equal(router.get('categoryName'), navConstants.DEFAULT_CATEGORY_NAME);
    Backbone.history.navigate('gitterHQ/topics/categories/test', trigger);
    assert.equal(router.get('categoryName'), 'test');
  });

  it('should set the right state after dispatching a forum navigate action', function(){
    dispatch({
      type: forumCatConstants.NAVIGATE_TO_CATEGORY,
      route: navConstants.FORUM_ROUTE,
      category: 'test'
    });
    assert.equal(router.get('categoryName'), 'test');
    assert.equal(router.get('route'), navConstants.FORUM_ROUTE);
  });

  it('should set the right state after dispatching a forum filter action', () => {
    dispatch({
      type: forumFilterConstants.NAVIGATE_TO_FILTER,
      route: navConstants.FORUM_ROUTE,
      filter: 'test'
    });
    assert.equal(router.get('filterName'), 'test');
    assert.equal(router.get('route'), navConstants.FORUM_ROUTE);
  });

  it('should set the right state after dispatching a forum tag action', () => {
    dispatch({
      type: forumTagConstants.NAVIGATE_TO_TAG,
      route: navConstants.FORUM_ROUTE,
      tag: 'test'
    });
    assert.equal(router.get('tagName'), 'test');
    assert.equal(router.get('route'), navConstants.FORUM_ROUTE);
  });

  it('should set the right state after dispatching a forum sort action', () => {
    dispatch({
      type: forumSortConstants.NAVIGATE_TO_SORT,
      route: navConstants.FORUM_ROUTE,
      sort: 'test'
    });
    assert.equal(router.get('sortName'), 'test');
    assert.equal(router.get('route'), navConstants.FORUM_ROUTE);
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

  it('should identify create topic', () => {
    assert.equal(router.get('categoryName'), navConstants.DEFAULT_CATEGORY_NAME);
    Backbone.history.navigate('gitterHQ/topics/create-topic', trigger);
    assert.equal(router.get('route'), navConstants.CREATE_TOPIC_ROUTE);
    assert.equal(router.get('createTopic'), true);
  });

  it('should have the right route param when on the topic page', () => {
    Backbone.history.navigate('gitterHQ/topics/topic/123/this-is-a-slug', trigger);
    assert.equal(router.get('route'), navConstants.TOPIC_ROUTE);
  });

  it('should dispatch the right event when the filter name changes', () => {
    var spy = sinon.spy();
    router.on(forumFilterConstants.UPDATE_ACTIVE_FILTER, spy);
    router.set('filterName', 'test');
    assert.equal(spy.callCount, 1);
    assert(spy.calledWithMatch({ filter: 'test' }));
  });

  it('should dispatch the right event when the filter name changes', () => {
    var spy = sinon.spy();
    router.on(forumSortConstants.UPDATE_ACTIVE_SORT, spy);
    router.set('sortName', 'test');
    assert.equal(spy.callCount, 1);
    assert(spy.calledWithMatch({ sort: 'test' }));
  });

  it('should have the right params after moving to a topic', () => {
    dispatch(navigateToTopic('gitterHQ', '12345', 'slug'));
    assert.equal(router.get('groupUri'), 'gitterHQ');
    assert.equal(router.get('topicId'), '12345');
    assert.equal(router.get('slug'), 'slug');
  });

  it('should have the right params after moving to create topic', () => {
    dispatch(navigateToCreateTopic());
    assert(router.get('createTopic'));
  });

  it('should set createTopic to false when navigating from /create-topic to /topics', () => {
    dispatch(navigateToCreateTopic());
    dispatch(navigateToCategory(navConstants.DEFAULT_CATEGORY_NAME));
    assert.equal(router.get('createTopic'), false);
  });

});
