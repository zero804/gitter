'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var appEvents = require('gitter-web-appevents');
var replyService = require('gitter-web-topics/lib/reply-service');
var commentService = require('gitter-web-topics/lib/comment-service');


require('../../server/event-listeners').install();

describe('replies-live-collection', function() {
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
    }
  });

  it('should emit a create event when creating a reply', function() {
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/topics/' + fixture.topic1.id + '/replies',
      operation: 'create',
      model: {
        // the body is serialized as body.text and body.html whereas create
        // just takes text..
        body: {
          text: 'woo'
        }
      }
    });

    return replyService.createReply(fixture.user1, fixture.topic1, {
        text: 'woo'
      })
      .then(checkEvent);
  });

  it('should emit a patch event when adding a comment', function() {
    assert.ok(!fixture.reply1.lastModified);

    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/topics/' + fixture.topic1.id + '/replies',
      operation: 'patch',
      type: 'reply',
      model: {
        id: fixture.reply1.id.toString(),
        commentsTotal: 1
      }
    });

    return commentService.createComment(fixture.user1, fixture.reply1, {
        text: 'eeeep'
      })
      .then(checkEvent)
      .then(function(event) {
        // the patch event must also contain lastModified
        assert.ok(event.model.lastModified);

        return replyService.findById(fixture.reply1._id)
          .then(function(reply) {
            // lastModified must now exist and match the one we got in the event.
            assert.ok(reply.lastModified);
            assert.strictEqual(reply.lastModified.getTime(), event.model.lastModified.getTime());
          });
      });
  });
});
