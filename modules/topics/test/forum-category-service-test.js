"use strict";

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var forumCategoryService = require('../lib/forum-category-service');

describe('forum-category-service #slow', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    forum1: {},
    category1: {
      forum: 'forum1'
    }
  });

  it('should add a category', function() {
    return forumCategoryService.createCategory(fixture.user1, fixture.forum1, {
        name: 'foo',
        slug: 'foo'
      })
      .then(function(category) {
        assert.strictEqual(category.name, 'foo');
      });
  });

  it('should update a category', function() {
    return forumCategoryService.updateCategory(fixture.user1, fixture.category1, {
        name: 'foo',
        slug: 'bar',
      })
      .then(function(category) {
        assert.strictEqual(category.name, 'foo');
        assert.strictEqual(category.slug, 'bar');
      });
  });
});
