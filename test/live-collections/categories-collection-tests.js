'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var appEvents = require('gitter-web-appevents');
var forumCategoryService = require('gitter-web-topics/lib/forum-category-service');


require('../../server/event-listeners').install();

describe('topics-live-collection #slow', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    forum1: {
      tags: ['cats', 'dogs']
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
});
