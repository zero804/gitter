"use strict";

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var topicService = require('../lib/topic-service');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

describe('topic-service #slow', function() {
  fixtureLoader.disableMongoTableScans();

  var fixture = fixtureLoader.setup({
    user1: {},
    forum1: {},
    category1: {
      forum: 'forum1'
    },
    category2: {
      forum: 'forum1'
    },
    topic1: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1'
    }
  });

  it('should add a topic', function() {
    return topicService.createTopic(fixture.user1, fixture.category1, {
        title: 'foo',
        slug: 'foo',
        tags: ['cats', 'dogs'],
        sticky: 1,
        text: 'This is **my** story.',
        allowedTags: ['cats', 'dogs']
      })
      .then(function(topic) {
        assert.strictEqual(topic.title, 'foo');
        assert(mongoUtils.objectIDsEqual(topic.forumId, fixture.forum1._id));
        assert(mongoUtils.objectIDsEqual(topic.userId, fixture.user1._id));
        assert(mongoUtils.objectIDsEqual(topic.categoryId, fixture.category1._id));
        assert.deepEqual(topic.tags.slice(), ['cats', 'dogs']);
        assert.strictEqual(topic.sticky, 1);
        assert.strictEqual(topic.number, 1);
        assert.strictEqual(topic.text, 'This is **my** story.');
        assert.strictEqual(topic.html, 'This is <strong>my</strong> story.');
      });
  });

  it('should update a topic', function() {
    return topicService.updateTopic(fixture.user1, fixture.topic1, {
        title: 'foo',
        slug: 'bar',
        text: '**baz**'
      })
      .then(function(topic) {
        assert.strictEqual(topic.title, 'foo');
        assert.strictEqual(topic.slug, 'bar');
        assert.strictEqual(topic.text, '**baz**');
        assert.strictEqual(topic.html, '<strong>baz</strong>');
      });
  });

  it("should set a topic's tags", function() {
    var tags = ['cats', 'dogs'];
    return topicService.setTopicTags(fixture.user1, fixture.topic1, tags, {
        allowedTags: tags
      })
      .then(function(topic) {
        assert.deepEqual(topic.tags, tags);
      });
  });

  it("should set a topic's sticky number", function() {
    return topicService.setTopicSticky(fixture.user1, fixture.topic1, 1)
      .then(function(topic) {
        assert.strictEqual(topic.sticky, 1);
      });
  });

  it("should set a topic's category", function() {
    return topicService.setTopicCategory(fixture.user1, fixture.topic1, fixture.category2)
      .then(function(topic) {
        assert(mongoUtils.objectIDsEqual(topic.categoryId, fixture.category2._id));
      });
  });
});
