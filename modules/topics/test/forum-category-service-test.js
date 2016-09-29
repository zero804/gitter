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
    },
    category2: {
      forum: 'forum1'
    },
    category3: {
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

  it('should not blow up when updating with no changed fields', function() {
    return forumCategoryService.updateCategory(fixture.user1, fixture.category2, {
        name: fixture.category2.name,
        slug: fixture.category2.slug,
      })
      .then(function(category) {
        assert.strictEqual(category.name, fixture.category2.name);
        assert.strictEqual(category.slug, fixture.category2.slug);
      });
  });

  it('should not blow up when updating with no known fields', function() {
    return forumCategoryService.updateCategory(fixture.user1, fixture.category3, {
        mumble: 'core',
      })
      .then(function(category) {
        assert.strictEqual(category.name, fixture.category3.name);
        assert.strictEqual(category.slug, fixture.category3.slug);
      });
  });
});
