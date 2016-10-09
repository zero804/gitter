'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var appEvents = require('gitter-web-appevents');
var commentService = require('gitter-web-topics/lib/comment-service');


require('../../server/event-listeners').install();

describe('comments-live-collection #slow', function() {
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
    },
    comment2: {
      user: 'user1',
      forum: 'forum1',
      topic: 'topic1',
      reply: 'reply1'
    }
  });

  it('should emit a create event when creating a comment', function() {
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/topics/' + fixture.topic1.id + '/replies/' + fixture.reply1.id + '/comments',
      operation: 'create',
      model: {
        body: {
          text: 'woo'
        }
      }
    });

    return commentService.createComment(fixture.user1, fixture.reply1, {
        text: 'woo'
      })
      .then(checkEvent);
  });

  it('should emit an update event when changing the text', function() {
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/topics/' + fixture.topic1.id + '/replies/' + fixture.reply1.id + '/comments',
      operation: 'update',
      type: 'comment',
      model: {
        id: fixture.comment1.id.toString(),
        body: {
          text: 'new text',
          html: 'new text',
        }
      },
    });

    return commentService.updateComment(fixture.user1, fixture.comment1, {
        text: 'new text'
      })
      .then(checkEvent)
      .then(function(event) {
        // the patch event must also contain editedAt
        assert.ok(event.model.editedAt);
      });
  });

  it('should emit a remove event when deleting the comment', function() {
    var comment = fixture.comment2;
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + comment.forumId + '/topics/' + comment.topicId + '/replies/' + comment.replyId + '/comments',
      operation: 'remove',
      type: 'comment',
      model: {
        id: comment.id.toString(),
      }
    });

    return commentService.deleteComment(fixture.user1, comment)
      .then(checkEvent);
  });
});
