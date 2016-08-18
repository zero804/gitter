"use strict";

var assert = require('assert');
var categoryStore = require('../../../../server/stores/forum-category-store');

describe('CategoryStore', function(){

  const categories = [ 1, 2, 3];
  const parsedCategories = [
    {category: 'all', active: true },
    {category: 1, active: false },
    {category: 2, active: false },
    {category: 3, active: false }
  ];

  it('should return an object with models', function(){
    /*
     TODO -->
     The models attribute is not used: REMOVE
     */
    assert(categoryStore().models, 'should return a models property');
  });

  it('should return the payload its proved with', function(){
    assert.deepEqual(categoryStore(categories).models, parsedCategories);
  });

  it('should return models when getCategories is called', function(){
    assert.deepEqual(categoryStore(categories).getCategories(), parsedCategories);
  });

  it('should add an initial category of all', function(){
    assert.equal(categoryStore(categories).getCategories()[0].category, 'all');
  });

  it('should add active to the all category no filter is passed', function(){
    assert(categoryStore(categories).getCategories()[0].active);
  });

  it('should add an active property the right category on init', function(){
    assert(categoryStore(categories, 1).getCategories()[1].active);
  });


});
