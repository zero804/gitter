'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var appEvents = require('gitter-web-appevents');
var topicService = require('gitter-web-topics/lib/topic-service');
var replyService = require('gitter-web-topics/lib/reply-service');
var commentService = require('gitter-web-topics/lib/comment-service');


require('../../server/event-listeners').install();

describe('topics-live-collection #slow', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    forum1: {
      tags: ['cats', 'dogs']
    },
    category1: {
      forum: 'forum1'
    },
    // for changing the category
    category2: {
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
    // for other smaller patches directly to topic
    topic3: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1'
    },
    // for changing the category
    topic4: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1'
    },
    // to be deleted
    topic5: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1'
    },
    // for patching the topic when deleting a reply
    topic6: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1'
    },
    reply1: {
      user: 'user1',
      forum: 'forum1',
      topic: 'topic2'
    },
    // for deleting a reply
    reply2: {
      user: 'user1',
      forum: 'forum1',
      topic: 'topic6'
    },
    // for deleting a comment
    reply3: {
      user: 'user1',
      forum: 'forum1',
      topic: 'topic6'
    },
    comment1: {
      user: 'user1',
      forum: 'forum1',
      topic: 'topic6',
      reply: 'reply3'
    },
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

  it('should emit an update event when adding a reply', function() {
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/topics',
      operation: 'update',
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
        // the patch event must also contain lastChanged
        assert.ok(event.model.lastChanged);

        return topicService.findById(fixture.topic1._id)
          .then(function(topic) {
            // lastChanged must now match the one we got in the event.
            assert.ok(topic.lastChanged);
            var lastChanged = new Date(event.model.lastChanged);
            assert.strictEqual(topic.lastChanged.getTime(), lastChanged.getTime());
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
        return topicService.findById(fixture.topic2._id)
          .then(function(topic) {
            // lastChanged must now match the one we got in the patch event.
            assert.ok(topic.lastChanged);
            var lastChanged = new Date(event.model.lastChanged);
            assert.strictEqual(topic.lastChanged.getTime(), lastChanged.getTime());
          });
      });
  });

  it('should emit an update event when changing the title', function() {
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/topics',
      operation: 'update',
      type: 'topic',
      model: {
        id: fixture.topic3.id.toString(),
        title: 'new title'
      },
    });

    return topicService.updateTopic(fixture.user1, fixture.topic3, {
        title: 'new title'
      })
      .then(checkEvent);
  });

  it('should emit an update event when changing the slug', function() {
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/topics',
      operation: 'update',
      type: 'topic',
      model: {
        id: fixture.topic3.id.toString(),
        slug: 'new-slug'
      },
    });

    return topicService.updateTopic(fixture.user1, fixture.topic3, {
        slug: 'new-slug'
      })
      .then(checkEvent);
  });

  it('should emit an update event when changing the text', function() {
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/topics',
      operation: 'update',
      type: 'topic',
      model: {
        id: fixture.topic3.id.toString(),
        body: {
          text: 'new text',
          html: 'new text',
        }
      },
    });

    return topicService.updateTopic(fixture.user1, fixture.topic3, {
        text: 'new text'
      })
      .then(checkEvent)
      .then(function(event) {
        // the event must also contain editedAt
        assert.ok(event.model.editedAt);
      });
  });

  it('should emit a patch event when changing the tags', function() {
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/topics',
      operation: 'patch',
      type: 'topic',
      model: {
        id: fixture.topic3.id.toString(),
        tags: ['cats', 'dogs']
      },
    });

    return topicService.setTopicTags(fixture.user1, fixture.topic3, ['cats', 'dogs'], {
        allowedTags: fixture.forum1.tags
      })
      .then(checkEvent);
  });

  it('should emit a patch event when changing the sticky number', function() {
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/topics',
      operation: 'patch',
      type: 'topic',
      model: {
        id: fixture.topic3.id.toString(),
        sticky: 1
      },
    });

    return topicService.setTopicSticky(fixture.user1, fixture.topic3, 1)
      .then(checkEvent);
  });

  it('should emit an update event when changing the category', function() {
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/topics',
      operation: 'update',
      type: 'topic',
      model: {
        id: fixture.topic4.id.toString(),
      },
    });

    return topicService.setTopicCategory(fixture.user1, fixture.topic4, fixture.category2)
      .then(checkEvent)
      .then(function(event) {
        assert.strictEqual(event.model.category.id.toString(), fixture.category2._id.toString());
      });
  });

  it('should emit a remove event when deleting the topic', function() {
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/topics',
      operation: 'remove',
      type: 'topic',
      model: {
        id: fixture.topic5.id.toString(),
      }
    });

    return topicService.deleteTopic(fixture.user1, fixture.topic5)
      .then(checkEvent);
  });

  it('should emit an update event when deleting a reply', function() {
    var topic = fixture.topic6;
    var reply = fixture.reply2;

    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + reply.forumId + '/topics',
      operation: 'update',
      type: 'topic',
      model: {
        id: topic.id.toString(),
        // the topic now only has 1 reply
        repliesTotal: 1
      },
    });

    return replyService.deleteReply(fixture.user1, reply)
      .then(checkEvent)
      .then(function(event) {
        // the patch event must also contain lastChanged
        assert.ok(event.model.lastChanged);
      });
  });

  it('should emit a patch event when deleting a comment', function() {
    var topic = fixture.topic6;
    var comment = fixture.comment1;
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + comment.forumId + '/topics',
      operation: 'patch',
      type: 'topic',
      model: {
        id: topic.id.toString()
      },
    });

    return commentService.deleteComment(fixture.user1, comment)
      .then(checkEvent)
      .then(function(event) {
        // the patch event must also contain lastChanged
        assert.ok(event.model.lastChanged);
      });
  });
});
