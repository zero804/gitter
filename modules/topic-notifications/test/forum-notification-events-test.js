"use strict";

var Promise = require('bluebird');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var forumNotificationEvents = require('../lib/forum-notification-events');
var subscriberService = require('../lib/subscriber-service');
var ForumObject = require('../lib/forum-object');

describe('forum-notification-events', function() {

  describe('integration tests #slow', function() {

    describe('createTopic', function() {

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

      it('forum subscribers should be notified on a new topic', function() {
        var forumRef = ForumObject.createForForum(fixture.forum1._id);

        return subscriberService.addSubscriber(forumRef, fixture.user2._id)
          .then(function() {
            return forumNotificationEvents.createTopic(fixture.topic1);
          })
          .then(function(userIds) {
            assert.deepEqual(userIds.map(String), [fixture.user2.id]);
          });
      });
    });

    describe('createReply', function() {

      var fixture = fixtureLoader.setup({
        user1: {},
        user2: {},
        user3: {},
        forum1: {},
        category1: {
          forum: 'forum1',
        },
        topic1: {
          user: 'user1',
          forum: 'forum1',
          category: 'category1',
        },
        topic2: {
          user: 'user1',
          forum: 'forum1',
          category: 'category1',
        },
        reply1: {
          forum: 'forum1',
          category: 'category1',
          user: 'user2',
          topic: 'topic1',
        },
        reply2: {
          forum: 'forum1',
          category: 'category1',
          user: 'user1',
          topic: 'topic2',
        }
      });

      it('should notify topic subscribers on a new reply', function() {
        var topicRef = ForumObject.createForTopic(fixture.forum1._id, fixture.topic1._id);

        return subscriberService.addSubscriber(topicRef, fixture.user2._id)
          .then(function() {
            return forumNotificationEvents.createReply(fixture.reply1);
          })
          .then(function(userIds) {
            assert.deepEqual(userIds.map(String), []);
          });
      });

      it('should not notify forum subscribers on a new reply', function() {
        var forumRef = ForumObject.createForForum(fixture.forum1._id);
        var topicRef = ForumObject.createForTopic(fixture.forum1._id, fixture.topic2._id);

        return Promise.join([
            subscriberService.addSubscriber(forumRef, fixture.user3._id),
            subscriberService.addSubscriber(topicRef, fixture.user2._id)
          ])
          .then(function() {
            return forumNotificationEvents.createReply(fixture.reply2);
          })
          .then(function(userIds) {
            assert.deepEqual(userIds.map(String), [fixture.user2.id]);
          });
      });
    })

    describe('createComment', function() {

      var fixture = fixtureLoader.setup({
        user1: {},
        user2: {},
        user3: {},
        forum1: {},
        category1: {
          forum: 'forum1',
        },
        topic1: {
          user: 'user1',
          forum: 'forum1',
          category: 'category1',
        },
        reply1: {
          forum: 'forum1',
          category: 'category1',
          user: 'user2',
          topic: 'topic1',
        },
        comment1: {
          user: 'user3',
          forum: 'forum1',
          topic: 'topic1',
          reply: 'reply1'
        }
      });

      it('comments should notify reply subscribers', function() {
        var replyRef = ForumObject.createForReply(fixture.forum1._id, fixture.topic1._id, fixture.reply1._id);

        return Promise.all([
            subscriberService.addSubscriber(replyRef, fixture.user1._id),
            subscriberService.addSubscriber(replyRef, fixture.user2._id)
          ])
          .then(function() {
            return forumNotificationEvents.createComment(fixture.comment1);
          })
          .then(function(userIds) {
            assert.deepEqual(userIds.map(String), [fixture.user1.id, fixture.user2.id]);
          });
      });

    })

  });

});
