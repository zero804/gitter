"use strict";

var Promise = require('bluebird');
var assert = require('assert');
var ForumObject = require('../lib/forum-object');
var notificationService = require('../lib/notification-service');
var topicNotificationGenerator = require('../lib/topic-notificaton-generator');
var RxNode = require('rx-node');
var ObjectID = require('mongodb').ObjectID;
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var mailerTemplate = require('gitter-web-mailer/lib/mailer-template');

describe('forum-notification-events', function() {

  describe('integration tests #slow', function() {

    describe('notificationObserver multi', function() {
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
        topic2: {
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

      it('should raise notifications', function() {

        var userId = fixture.user1._id;
        var forumId = fixture.forum1._id;
        var topicId1 = fixture.topic1._id;
        var topicId2 = fixture.topic2._id;
        var replyId = fixture.reply1._id;
        var topicRef1 = ForumObject.createForTopic(forumId, topicId1);
        var topicRef2 = ForumObject.createForTopic(forumId, topicId2);
        var replyRef = ForumObject.createForReply(forumId, topicId1, replyId);


        // Create three notifications in order
        return notificationService.createNotifications(topicRef1, [userId])
          .then(function() {
            return notificationService.createNotifications(topicRef2, [userId]);
          })
          .then(function() {
            return notificationService.createNotifications(replyRef, [userId]);
          })
          .then(function() {
            return topicNotificationGenerator.notificationObserver({ userId: userId })
              .toArray()
              .toPromise();
          })
          .then(function(notifications) {
            assert.strictEqual(notifications.length, 3);

            assert.strictEqual(notifications[0].data.topic.id, String(topicId1));
            assert.strictEqual(notifications[1].data.topic.id, String(topicId2));
            assert.strictEqual(notifications[2].data.topic.id, String(topicId1));

            assert(!notifications[0].data.reply);
            assert(!notifications[1].data.reply);
            assert.strictEqual(notifications[2].data.reply.id, String(replyId));

            notifications.forEach(function(notification) {
              // Check that the user matches
              assert.strictEqual(String(notification.recipient._id), String(userId));

              // Check that the forum matches
              assert.strictEqual(notification.data.forum.id, String(forumId));
            });

          });
      });
    });

    describe('notificationObserver new topic', function() {
      var fixture = fixtureLoader.setup({
        user1: {},
        forum1: {},
        category1: {
          forum: 'forum1',
        },
        topic1: {
          user: 'user1',
          forum: 'forum1',
          category: 'category1',
          sent: new Date('2014-01-01T00:00:00.000Z'),
          title: 'Hello',
          html: '<strong>Hello</strong>',
          text: '**Hello**'
        },
      });

      it('should raise notifications', function() {

        var userId = fixture.user1._id;
        var forumId = fixture.forum1._id;
        var topicId1 = fixture.topic1._id;
        var topicRef1 = ForumObject.createForTopic(forumId, topicId1);

        // Create three notifications in order
        return notificationService.createNotifications(topicRef1, [userId])
          .then(function() {
            return topicNotificationGenerator.notificationObserver({ userId: userId })
              .toPromise();
          })
          .then(function(notification) {
            return mailerTemplate('topic_new_topic_notification_html', {
              notification: notification.data
            });
          });
      });
    });

    describe('notificationObserver new reply', function() {
      var fixture = fixtureLoader.setup({
        user1: {},
        forum1: {},
        category1: {
          forum: 'forum1',
        },
        topic1: {
          user: 'user1',
          forum: 'forum1',
          category: 'category1',
          title: 'Hello',
          html: '<strong>Hello</strong>',
          text: '**Hello**'
        },
        reply1: {
          forum: 'forum1',
          category: 'category1',
          user: 'user1',
          topic: 'topic1',
          text: '*Goodbye*',
          html: '<strong>Goodbye</strong>',
        },
      });

      it('should raise notifications', function() {

        var userId = fixture.user1._id;
        var forumId = fixture.forum1._id;
        var topicId1 = fixture.topic1._id;
        var replyId1 = fixture.reply1._id;
        var replyRef1 = ForumObject.createForReply(forumId, topicId1, replyId1);

        // Create three notifications in order
        return notificationService.createNotifications(replyRef1, [userId])
          .then(function() {
            return topicNotificationGenerator.notificationObserver({ userId: userId })
              .toPromise();
          })
          .then(function(notification) {
            return mailerTemplate('topic_new_reply_notification_html', {
              notification: notification.data
            });
          });
      });
    });

    describe('notificationObserver new comment', function() {
      var fixture = fixtureLoader.setup({
        user1: {},
        forum1: {},
        category1: {
          forum: 'forum1',
        },
        topic1: {
          user: 'user1',
          forum: 'forum1',
          category: 'category1',
          title: 'Hello',
          html: '<strong>Hello</strong>',
          text: '**Hello**'
        },
        reply1: {
          forum: 'forum1',
          category: 'category1',
          user: 'user1',
          topic: 'topic1',
          text: '*Goodbye*',
          html: '<strong>Goodbye</strong>',
        },
        comment1: {
          user: 'user1',
          forum: 'forum1',
          topic: 'topic1',
          reply: 'reply1',
          text: '*xxx*',
          html: '<strong>xxx</strong>',
        }
      });

      it('should raise notifications', function() {

        var userId = fixture.user1._id;
        var forumId = fixture.forum1._id;
        var topicId1 = fixture.topic1._id;
        var replyId1 = fixture.reply1._id;
        var commentId1 = fixture.comment1._id;
        var commentRef1 = ForumObject.createForComment(forumId, topicId1, replyId1, commentId1);

        // Create three notifications in order
        return notificationService.createNotifications(commentRef1, [userId])
          .then(function() {
            return topicNotificationGenerator.notificationObserver({ userId: userId })
              .toPromise();
          })
          .then(function(notification) {
            return mailerTemplate('topic_new_comment_notification_html', {
              notification: notification.data
            });
          });
      });
    });


    describe.skip('streamNotificationsForEmail', function() {
      var userId = new ObjectID();
      var forumId = new ObjectID();
      var topicId1 = new ObjectID();
      var topicId2 = new ObjectID();
      var replyId = new ObjectID();
      var topicRef1 = ForumObject.createForTopic(forumId, topicId1);
      var topicRef2 = ForumObject.createForTopic(forumId, topicId2);
      var replyRef = ForumObject.createForReply(forumId, topicId1, replyId);

      it('should raise notifications', function() {

        return Promise.join(
            notificationService.createNotifications(topicRef1, [userId]),
            notificationService.createNotifications(topicRef2, [userId]),
            notificationService.createNotifications(replyRef, [userId])
          )
          .then(function() {
            var stream = topicNotificationGenerator.streamNotificationsForEmail({ userId: userId })
            var observable = RxNode.fromReadableStream(stream);

            return observable
              .toArray()
              .toPromise();
          })
          .then(function(notifications) {
            assert.strictEqual(notifications.length, 2);

            assert(notifications.some(function(notification) {
              return mongoUtils.objectIDsEqual(notification.userId, userId) &&
                mongoUtils.objectIDsEqual(notification.forumId, forumId) &&
                mongoUtils.objectIDsEqual(notification.topicId, topicId1) &&
                notification.notifications.length === 2 &&
                notification.notifications[0].replyId === null &&
                notification.notifications[0].commentId === null &&
                mongoUtils.objectIDsEqual(notification.notifications[1].replyId, replyId) &&
                notification.notifications[1].commentId === null;
              }));

            assert(notifications.some(function(notification) {
              return mongoUtils.objectIDsEqual(notification.userId, userId) &&
                mongoUtils.objectIDsEqual(notification.forumId, forumId) &&
                mongoUtils.objectIDsEqual(notification.topicId, topicId2) &&
                notification.notifications.length === 1 &&
                notification.notifications[0].replyId === null &&
                notification.notifications[0].commentId === null;
              }));

          })

      });
    });

  });

});
