'use strict';

var testRequire = require('../test-require');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var Promise = require('bluebird');
var ForumWithPolicyService = testRequire('./services/forum-with-policy-service');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');


var adminPolicy = {
  canAdmin: function() {
    return Promise.resolve(true);
  },
  canWrite: function() {
    return Promise.resolve(true);
  }
};

describe('forum-with-policy-service #slow', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    forum1: {
      tags: ['cats', 'dogs']
    },
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
    },
    topic2: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1'
    },
    reply1: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1',
      topic: 'topic1'
    },
    /*
    comment1: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1',
      topic: 'topic1',
      reply: 'reply1'
    }
    */
  });

  var forumWithPolicyService;

  before(function() {
    forumWithPolicyService = new ForumWithPolicyService(fixture.forum1, fixture.user1, adminPolicy);
  });

  it('should allow admins to create categories', function() {
    return forumWithPolicyService.createCategory({ name: 'foo' })
      .then(function(category) {
        assert.strictEqual(category.name, 'foo');
      });
  });

  it('should allow members to create topics', function() {
    return forumWithPolicyService.createTopic(fixture.category1, {
        title: 'foo',
        tags: ['cats', 'dogs'],
        sticky: 1,
        text: 'This is **my** story.'
      })
      .then(function(topic) {
        assert.strictEqual(topic.title, 'foo');
        assert(mongoUtils.objectIDsEqual(topic.categoryId, fixture.category1._id));
        assert.deepEqual(topic.tags.slice(), ['cats', 'dogs']);
        assert.strictEqual(topic.sticky, 1);
        assert.strictEqual(topic.text, 'This is **my** story.');
        assert.strictEqual(topic.html, 'This is <strong>my</strong> story.');
      });
  });

  it('should allow members to reply to topics', function() {
    return forumWithPolicyService.createReply(fixture.topic1, {
        text: '_Helloooo_'
      })
      .then(function(reply) {
        assert(mongoUtils.objectIDsEqual(reply.userId, fixture.user1._id));
        assert(mongoUtils.objectIDsEqual(reply.forumId, fixture.forum1._id));
        assert(mongoUtils.objectIDsEqual(reply.topicId, fixture.topic1._id));
        assert.strictEqual(reply.text, '_Helloooo_');
        assert.strictEqual(reply.html, '<em>Helloooo</em>');
      });
  });

  it('should allow members to comment on replies', function() {
    return forumWithPolicyService.createComment(fixture.reply1, {
        text: '**hi!**'
      })
      .then(function(comment) {
        assert(mongoUtils.objectIDsEqual(comment.userId, fixture.user1._id));
        assert(mongoUtils.objectIDsEqual(comment.forumId, fixture.forum1._id));
        assert(mongoUtils.objectIDsEqual(comment.topicId, fixture.topic1._id));
        assert(mongoUtils.objectIDsEqual(comment.replyId, fixture.reply1._id));
        assert.strictEqual(comment.text, '**hi!**');
        assert.strictEqual(comment.html, '<strong>hi!</strong>');
      });

  });

  it("should allow admins to set a forum's tags", function() {
    // deliberately making the new set a superset if the existing ones in case
    // tests run out of order
    var tags = ['cats', 'dogs', 'mice'];
    return forumWithPolicyService.setForumTags(tags)
      .then(function(forum) {
        assert.deepEqual(forum.tags, tags);
      });
  });

  it("should allow members to set a topic's title", function() {
    return forumWithPolicyService.updateTopic(fixture.topic1, { title: "foo" })
      .then(function(topic) {
        assert.strictEqual(topic.title, "foo");
      });
  });

  it("should allow members to set a topic's slug", function() {
    return forumWithPolicyService.updateTopic(fixture.topic1, { slug: "bar" })
      .then(function(topic) {
        assert.strictEqual(topic.slug, "bar");
      });
  });

  it("should allow members to set a topic's text", function() {
    return forumWithPolicyService.updateTopic(fixture.topic1, { text: "**baz**" })
      .then(function(topic) {
        assert.strictEqual(topic.text, "**baz**");
        assert.strictEqual(topic.html, "<strong>baz</strong>");
      });
  });

  it("should allow members to update all the topic's core fields in one go", function() {
    return forumWithPolicyService.updateTopic(fixture.topic2, {
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

  it("should allow members to set a topic's tags", function() {
    assert.strictEqual(fixture.topic1.tags.length, 0);

    var tags = ['cats', 'dogs'];
    return forumWithPolicyService.setTopicTags(fixture.topic1, tags)
      .then(function(topic) {
        assert.deepEqual(topic.tags, tags);
      });
  });

  it("should allow members to set a topic's sticky number", function() {
    return forumWithPolicyService.setTopicSticky(fixture.topic1, 1)
      .then(function(topic) {
        assert.strictEqual(topic.sticky, 1);
      });
  });

  it("should allow members to set a topic's category", function() {
    return forumWithPolicyService.setTopicCategory(fixture.topic1, fixture.category2)
      .then(function(topic) {
        assert(mongoUtils.objectIDsEqual(topic.categoryId, fixture.category2._id));
      });
  });

  it("should allow members to update all the reply's core fields in one go", function() {
    return forumWithPolicyService.updateReply(fixture.reply1, {
        text: '**baz**'
      })
      .then(function(reply) {
        assert.strictEqual(reply.text, '**baz**');
        assert.strictEqual(reply.html, '<strong>baz</strong>');
      });
  });
});
