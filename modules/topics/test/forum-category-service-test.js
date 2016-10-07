"use strict";

var assert = require('assert');
var StatusError = require('statuserror');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var forumCategoryService = require('../lib/forum-category-service');

describe('forum-category-service #slow', function() {
  fixtureLoader.disableMongoTableScans();

  var fixture = fixtureLoader.setup({
    user1: {},
    forum1: {},
    // for updating name & slug (and you can't delete it because it isn't empty)
    category1: {
      forum: 'forum1'
    },
    // for updating with no changed fields
    category2: {
      forum: 'forum1'
    },
    // for updating with no known fields
    category3: {
      forum: 'forum1'
    },
    // to be deleted (it is empty)
    category4: {
      forum: 'forum1'
    },
    topic1: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1'
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

  it('should throw an error if you try and delete a non-empty category', function() {
    return forumCategoryService.deleteCategory(fixture.user1, fixture.category1)
      .then(function() {
        assert.ok(false, 'Expected error.');
      })
      .catch(StatusError, function(err) {
        assert.strictEqual(err.status, 409);
      });
  });

  it('should delete an empty category', function() {
    return forumCategoryService.deleteCategory(fixture.user1, fixture.category4)
      .then(function() {
        return forumCategoryService.findById(fixture.category4.id);
      })
      .then(function(category) {
        assert.strictEqual(category, null);
      });
  });
});
