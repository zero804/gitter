"use strict";

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var replyService = require('../lib/reply-service');

describe('reply-service', function() {

  describe('integration tests #slow', function() {

    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      forum1: {},
      category1: {
        forum: 'forum1',
      },
      topic1: {
        user: 'user1',
        forum: 'forum1',
        category: 'category1',
        sent: new Date('2014-01-01T00:00:00.000Z')
      },
      reply1: {
        forum: 'forum1',
        category: 'category1',
        user: 'user2',
        topic: 'topic1',
        sent: new Date('2014-01-01T00:00:00.000Z')
      },
    });

    describe('findSampleReplyingUserIdsForTopics', function() {
      it('should return users', function() {
        return replyService.findSampleReplyingUserIdsForTopics([fixture.topic1._id])
          .then(function(result) {
            assert.deepEqual(Object.keys(result), [fixture.topic1.id]);
            assert.deepEqual(result[fixture.topic1._id].map(String), [fixture.user2.id]);
          })
      })
    });

  });

});
