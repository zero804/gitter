'use strict';

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

  it('should emit an update event when adding a comment', function() {
    var checkEvent = appEvents.addListener('dataChange2', {
      url: '/forums/' + fixture.forum1.id + '/topics/' + fixture.topic1.id + '/replies',
      operation: 'update',
      model: {
        id: fixture.reply1.id
      }
    });

    return commentService.createComment(fixture.user1, fixture.reply1, {
        text: 'eeeep'
      })
      .then(checkEvent);
  });
});
