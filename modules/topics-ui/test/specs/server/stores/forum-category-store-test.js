"use strict";

var assert = require('assert');
var categoryStore = require('../../../../server/stores/forum-category-store');

describe('CategoryStore', function(){

  it('should return an object with getCategories', function(){
    assert(categoryStore().getCategories);
  });

  describe('getCategories', function(){
    it('should return the payload its proved with', function(){
      var categories = [ 1, 2, 3];
      assert.equal(categoryStore(categories).getCategories(), categories);
    });
  });

});
