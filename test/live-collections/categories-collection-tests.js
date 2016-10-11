'use strict';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var appEvents = require('gitter-web-appevents');
var forumCategoryService = require('gitter-web-topics/lib/forum-category-service');


require('../../server/event-listeners').install();

describe('categories-live-collection #slow', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    forum1: {
      tags: ['cats', 'dogs']
    },
    // for updating
    category1: {
      forum: 'forum1'
    },
    // for deleting
    category2: {
      forum: 'forum1'
    }
  });

  it('should emit a create event when creating a topic', function() {
    var categoryOptions = {
      name: 'Test',
      slug: 'test'
    };

    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/categories',
      type: 'category',
      operation: 'create',
      model: categoryOptions
    });

    return forumCategoryService.createCategory(fixture.user1, fixture.forum1, categoryOptions)
      .then(checkEvent);
  });

  it('should emit an update event when changing the name', function() {
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/categories',
      operation: 'update',
      type: 'category',
      model: {
        id: fixture.category1.id.toString(),
        name: 'new category name'
      },
    });

    return forumCategoryService.updateCategory(fixture.user1, fixture.category1, {
        name: 'new category name'
      })
      .then(checkEvent);
  });

  it('should emit an update event when changing the slug', function() {
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/categories',
      operation: 'update',
      type: 'category',
      model: {
        id: fixture.category1.id.toString(),
        slug: 'new-category-slug'
      },
    });

    return forumCategoryService.updateCategory(fixture.user1, fixture.category1, {
        slug: 'new-category-slug'
      })
      .then(checkEvent);
  });

  it('should emit a remove event when deleting the category', function() {
    var category = fixture.category2;
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/categories',
      operation: 'remove',
      type: 'category',
      model: {
        id: category.id.toString(),
      }
    });

    return forumCategoryService.deleteCategory(fixture.user1, category)
      .then(checkEvent);
  });
});
