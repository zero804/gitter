"use strict";

var assert = require('assert');
var CategoryStore = require('../../../../browser/js/stores/forum-category-store');

describe('ForumCategoryStore', function(){
  var categories;
  var categoryStore;
  beforeEach(function(){
    categories = [ 1, 2, 3, 4];
    categoryStore = new CategoryStore(categories);
  });

  it('should have return objects from getCategories', function(){
    assert.deepEqual(categories, categoryStore.getCategories());
  });

});
