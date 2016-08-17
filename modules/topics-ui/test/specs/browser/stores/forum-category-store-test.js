"use strict";

var assert = require('assert');
var sinon = require('sinon');
var Backbone = require('backbone');
var CategoryStore = require('../../../../browser/js/stores/forum-category-store');
var forumCatConstants = require('../../../../browser/js/constants/forum-categories');

describe('ForumCategoryStore', function(){

  let router;
  let categories;
  let categoryStore;
  let handle;

  beforeEach(function(){
    handle = sinon.spy();
    categories = [ { category: 'all', active: true }, { category: 'test-1', active: false } ];
    router = new Backbone.Model({ route: 'forum', categoryName: 'all' });
    categoryStore = new CategoryStore(categories, { router: router });
  });

  it('should update the active element when the route changes', function(){
    router.set('categoryName', 'test-1');
    assert.equal(categoryStore.at(0).get('active'), false);
    assert(categoryStore.at(1).get('active'));
  });

  it('should dispatch un active:update event when the active category changes', function(){
    categoryStore.on(forumCatConstants.UPDATE_ACTIVE_CATEGORY, handle)
    router.set('categoryName', 'test-1');
    assert.equal(handle.callCount, 1);
  });

  it('should return the active category name from getActiveCategoryName()', () => {
    assert.equal(categoryStore.getActiveCategoryName(), 'all');
  });

});
