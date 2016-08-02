"use strict";

var assert = require('assert');
var Backbone = require('backbone');
var CategoryStore = require('../../../../browser/js/stores/forum-category-store');
var serverSideStore = require('../../../../server/stores/forum-category-store.js');

describe('ForumCategoryStore', function(){
  var router;
  var categories;
  var categoryStore;
  beforeEach(function(){
    categories = [ { category: 'all', active: true }, { category: 'test-1', active: false } ];
    router = new Backbone.Model({ route: 'forum', categoryName: 'all' });
    categoryStore = new CategoryStore(categories, { router: router });
  });

  it.only('should update the active element when the route changes', function(){
    router.set('categoryName', 'test-1');
    assert.equal(categoryStore.at(0).get('active'), false);
    assert(categoryStore.at(1).get('active'));
  });

});
