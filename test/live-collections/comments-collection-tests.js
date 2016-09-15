'use strict';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var appEvents = require('gitter-web-appevents');
var commentService = require('gitter-web-topics/lib/comment-service');


require('../../server/event-listeners').install();

describe('comments-live-collection', function() {
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
});
