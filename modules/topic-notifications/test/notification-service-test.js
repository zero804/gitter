"use strict";

var assert = require('assert');
var ForumObject = require('gitter-web-topic-models/lib/forum-object');
var notificationService = require('../lib/notification-service');
var ObjectID = require('mongodb').ObjectID;

describe('notification-service', function() {

  describe('integration tests #slow', function() {

    describe('markNotificationAsEmailSent', function() {
      var userId = new ObjectID();
      var forumId = new ObjectID();
      var topicId1 = new ObjectID();
      var topicRef1 = ForumObject.createForTopic(forumId, topicId1);

      it('should raise notifications', function() {

        return notificationService.createNotifications(topicRef1, [userId])
          .then(function() {
            return notificationService.findNotification(topicRef1, userId);
          })
          .then(function(notification) {
            assert.strictEqual(notification.emailSent, null);
            return notificationService.markNotificationAsEmailSent(notification._id);
          })
          .then(function(result) {
            assert.strictEqual(result, true);
            return notificationService.findNotification(topicRef1, userId);
          })
          .then(function(notification) {
            assert(notification.emailSent);
            return notificationService.markNotificationAsEmailSent(notification._id);
          })
          .then(function(result) {
            assert.strictEqual(result, false);
          });
      });
    });

  });

});
