'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var appEvents = require('gitter-web-appevents');
var topicService = require('gitter-web-topics/lib/topic-service');
var replyService = require('gitter-web-topics/lib/reply-service');
var commentService = require('gitter-web-topics/lib/comment-service');


require('../../server/event-listeners').install();

describe('topics-live-collection', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    forum1: {},
    category1: {
      forum: 'forum1'
    },
    // for patching the topic when adding a reply
    topic1: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1'
    },
    // for patching the topic when adding a comment to its reply
    topic2: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1'
    },
    reply1: {
      user: 'user1',
      forum: 'forum1',
      topic: 'topic2'
    }
  });

  it('should emit a create event when creating a topic', function() {
    var topicOptions = {
      title: 'Test',
      slug: 'test'
    };

    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/topics',
      type: 'topic',
      operation: 'create',
      model: topicOptions
    });

    return topicService.createTopic(fixture.user1, fixture.category1, topicOptions)
      .then(checkEvent);
  });

  it('should emit a patch event when adding a reply', function() {
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/topics',
      operation: 'patch',
      type: 'topic',
      model: {
        id: fixture.topic1.id.toString(),
        // this is topic1's first reply
        repliesTotal: 1
      },
    });

    return replyService.createReply(fixture.user1, fixture.topic1, {
        text: 'woo'
      })
      .then(checkEvent)
      .then(function(event) {
        // the patch event must also contain lastChanged & lastModified
        assert.ok(event.model.lastChanged);
        assert.ok(event.model.lastModified);

        return topicService.findById(fixture.topic1._id)
          .then(function(topic) {
            // lastChanged & lastModified must now match the one we got in the
            // patch event.
            assert.ok(topic.lastChanged);
            assert.ok(topic.lastModified);
            var lastChanged = new Date(event.model.lastChanged);
            var lastModified = new Date(event.model.lastModified);
            assert.strictEqual(topic.lastChanged.getTime(), lastChanged.getTime());
            assert.strictEqual(topic.lastModified.getTime(), lastModified.getTime());
          });
      });
  });

  it('should emit a patch event when adding a comment', function() {
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/topics',
      operation: 'patch',
      type: 'topic',
      model: {
        id: fixture.topic2.id.toString()
      },
    });

    return commentService.createComment(fixture.user1, fixture.reply1, {
        text: 'fwooooo'
      })
      .then(checkEvent)
      .then(function(event) {
        // the patch event must also contain lastModified
        assert.ok(event.model.lastModified);

        return topicService.findById(fixture.topic2._id)
          .then(function(topic) {
            // lastChanged & lastModified must now match the one we got in the
            // patch event.
            assert.ok(topic.lastChanged);
            assert.ok(topic.lastModified);
            var lastChanged = new Date(event.model.lastChanged);
            var lastModified = new Date(event.model.lastModified);
            assert.strictEqual(topic.lastChanged.getTime(), lastChanged.getTime());
            assert.strictEqual(topic.lastModified.getTime(), lastModified.getTime());
          });
      });
  });
});
