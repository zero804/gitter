"use strict";

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var replyService = require('../lib/reply-service');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

describe('reply-service', function() {
  describe('integration tests #slow', function() {
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
      }
    });

    it('should add a reply', function() {
      return replyService.createReply(fixture.user1, fixture.topic1, {
          text: 'hello **there**'
        })
        .then(function(reply) {
          assert(mongoUtils.objectIDsEqual(reply.forumId, fixture.forum1._id));
          assert(mongoUtils.objectIDsEqual(reply.topicId, fixture.topic1._id));
          assert(mongoUtils.objectIDsEqual(reply.userId, fixture.user1._id));
          assert.strictEqual(reply.text, 'hello **there**');
          assert.strictEqual(reply.html, 'hello <strong>there</strong>');
        });
    });

    it("should update a reply's text", function() {
      return replyService.updateReply(fixture.user1, fixture.reply1, {
          text: 'hello **there**'
        })
        .then(function(reply) {
          assert.strictEqual(reply.text, 'hello **there**');
          assert.strictEqual(reply.html, 'hello <strong>there</strong>');
        });
    });
  });


  describe('integration tests', function() {
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
