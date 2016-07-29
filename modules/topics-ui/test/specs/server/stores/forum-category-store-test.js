"use strict";

var assert = require('assert');
var categoryStore = require('../../../../server/stores/forum-category-store');

describe('CategoryStore', function(){

  it('should return an object with models', function(){
    assert(categoryStore().models, 'should return a models property');
  });

  it('should return the payload its proved with', function(){
    var categories = [ 1, 2, 3];
    assert.equal(categoryStore(categories).models, categories);
  });

});
