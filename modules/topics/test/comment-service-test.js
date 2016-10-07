"use strict";

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var replyService = require('../lib/reply-service');
var commentService = require('../lib/comment-service');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

describe('comment-service #slow', function() {
  fixtureLoader.disableMongoTableScans();

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
    reply2: {
      user: 'user1',
      forum: 'forum1',
      topic: 'topic1'
    },
    // for updating
    comment1: {
      user: 'user1',
      forum: 'forum1',
      topic: 'topic1',
      reply: 'reply1'
    },
    // for deleting
    comment2: {
      user: 'user1',
      forum: 'forum1',
      topic: 'topic1',
      reply: 'reply2',
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

  it('should delete a comment', function() {
    return commentService.updateCommentsTotal(fixture.comment2.topicId, fixture.comment2.replyId)
      .spread(function(topic, reply) {
        // make sure we start at 1
        assert.strictEqual(reply.commentsTotal, 1);

        return commentService.deleteComment(fixture.user1, fixture.comment2);
      })
      .then(function() {
        return Promise.join(
          replyService.findById(fixture.comment2.replyId),
          commentService.findById(fixture.comment2._id));
      })
      .spread(function(reply, comment) {
        assert.strictEqual(reply.commentsTotal, 0);
        assert.strictEqual(comment, null);
      });
  });
});
