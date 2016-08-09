'use strict';

var testRequire = require('../test-require');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var Promise = require('bluebird');
var StatusError = require('statuserror');
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
    forum1: {},
    category1: {
      forum: 'forum1'
    },
    topic1: {
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
        sticky: true,
        text: 'This is **my** story.'
      })
      .then(function(topic) {
        assert.strictEqual(topic.title, 'foo');
        assert(mongoUtils.objectIDsEqual(topic.categoryId, fixture.category1._id));
        assert.deepEqual(topic.tags.slice(), ['cats', 'dogs']);
        assert.ok(topic.sticky);
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

});
