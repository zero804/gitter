"use strict";

var assert = require('assert');
var updateActiveCategory = require('../../../../../browser/js/action-creators/forum/update-active-category.js');
var forumCatConstants = require('../../../../../browser/js/constants/forum-categories');

describe('updateActiveCategory', () => {

  it('should return the right event type', () => {
    assert.equal(updateActiveCategory().type, forumCatConstants.UPDATE_ACTIVE_CATEGORY);
  });

  it('should provide a default category', () => {
    assert.equal(updateActiveCategory().category, 'all');
  });

  it('should return a category if given one', () => {
    assert.equal(updateActiveCategory('test').category, 'test');
  });

});
