"use strict";

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var commentService = require('../lib/comment-service');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

describe('comment-service #slow', function() {
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
      topic: 'topic1'
    },
    comment1: {
      user: 'user1',
      forum: 'forum1',
      topic: 'topic1',
      reply: 'reply1'
    }
  });

  it('should add a comment', function() {
    return commentService.createComment(fixture.user1, fixture.reply1, {
        text: 'Hello **there**',
      })
      .then(function(comment) {
        assert(mongoUtils.objectIDsEqual(comment.forumId, fixture.forum1._id));
        assert(mongoUtils.objectIDsEqual(comment.userId, fixture.user1._id));
        assert(mongoUtils.objectIDsEqual(comment.topicId, fixture.topic1._id));
        assert(mongoUtils.objectIDsEqual(comment.replyId, fixture.reply1._id));
        assert.strictEqual(comment.text, 'Hello **there**');
        assert.strictEqual(comment.html, 'Hello <strong>there</strong>');
      });
  });

  it("should update a comment's text", function() {
    return commentService.updateComment(fixture.user1, fixture.comment1, {
        text: 'hello **there**'
      })
      .then(function(comment) {
        assert.strictEqual(comment.text, 'hello **there**');
        assert.strictEqual(comment.html, 'hello <strong>there</strong>');
      });
  });
});
