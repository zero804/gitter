"use strict";

var assert = require('assert');
var categoryStore = require('../../../../server/stores/forum-category-store');

describe('CategoryStore', function(){

  const categories = [ {name: 1, slug: 1}, {name: 2, slug: 1}, {name: 3, slug: 1}];
  const parsedCategories = [
    {category: 'all', active: true },
    {category: 1, active: false },
    {category: 2, active: false },
    {category: 3, active: false }
  ];

  it('should return an object with models', function(){
    assert(categoryStore().models, 'should return a models property');
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
