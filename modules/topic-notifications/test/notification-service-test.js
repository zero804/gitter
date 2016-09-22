"use strict";

var Promise = require('bluebird');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var forumNotificationEvents = require('../lib/forum-notification-events');
var subscriberService = require('../lib/subscriber-service');
var ForumObject = require('../lib/forum-object');
var notificationService = require('../lib/notification-service');
var RxNode = require('rx-node');
var ObjectID = require('mongodb').ObjectID;
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

describe('forum-notification-events', function() {

  describe('integration tests #slow', function() {
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
          var stream = notificationService.streamNotificationsForEmail({ userId: userId })
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
