'use strict';

var assert = require('assert');
var subscriberService = require('../lib/subscriber-service');
var ObjectID = require('mongodb').ObjectID;
var ForumObject = require('../lib/forum-object');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('subscriber-service', function() {

  describe('integration tests #slow', function() {
    fixtureLoader.disableMongoTableScans();

    describe('should handle empty lists', function() {
      var forumId = new ObjectID();
      var topicId = new ObjectID();
      var replyId = new ObjectID();

      it('forums', function() {
        return subscriberService.listForItem(ForumObject.createForForum(forumId))
          .then(function(result) {
            assert.deepEqual(result, []);
          })
      });

      it('topics', function() {
        return subscriberService.listForItem(ForumObject.createForTopic(forumId, topicId))
          .then(function(result) {
            assert.deepEqual(result, []);
          })
      });

      it('replies', function() {
        return subscriberService.listForItem(ForumObject.createForReply(forumId, topicId, replyId))
          .then(function(result) {
            assert.deepEqual(result, []);
          })
      })

    });

    describe('should handle adding users', function() {
      var forumId = new ObjectID();
      var topicId = new ObjectID();
      var replyId = new ObjectID();
      var userId1 = new ObjectID();
      var userId2 = new ObjectID();

      function testForForumObject(id) {
        return subscriberService.createSubscriptionVisitorForUser(userId1, id.type, [id])
          .then(function(subscriptionVisitor) {
            assert.strictEqual(subscriptionVisitor.isSubscribed(id), false);

            return subscriberService.addSubscriber(id, userId1)
          })
          .then(function(result) {
            assert.strictEqual(result, true);
            return subscriberService.createSubscriptionVisitorForUser(userId1, id.type, [id])
          })
          .then(function(subscriptionVisitor) {
            assert.strictEqual(subscriptionVisitor.isSubscribed(id), true);
            return subscriberService.addSubscriber(id, userId1);
          })
          .then(function(result) {
            assert.strictEqual(result, false);
            return subscriberService.listForItem(id)
          })
          .then(function(result) {
            assert.deepEqual(result.map(String), [userId1.toString()]);
            return subscriberService.addSubscriber(id, userId2);
          })
          .then(function(result) {
            assert.strictEqual(result, true);
            return subscriberService.listForItem(id)
          })
          .then(function(result) {
            assert.deepEqual(result.map(String), [userId1, userId2].map(String));
            return subscriberService.removeSubscriber(id, userId1);
          })
          .then(function(result) {
            assert.strictEqual(result, true);
            return subscriberService.removeSubscriber(id, userId1);
          })
          .then(function(result) {
            assert.strictEqual(result, false);
            return subscriberService.removeSubscriber(id, userId2);
          })
          .then(function(result) {
            assert.strictEqual(result, true);
            return subscriberService.listForItem(id)
          })
          .then(function(result) {
            assert.deepEqual(result, []);
            return subscriberService.createSubscriptionVisitorForUser(userId1, id.type, [id])
          })
          .then(function(subscriptionVisitor) {
            assert.strictEqual(subscriptionVisitor.isSubscribed(id), false);
          });
      }

      it('forums', function() {
        var id = ForumObject.createForForum(forumId);
        return testForForumObject(id);
      });

      it('topics', function() {
        var id = ForumObject.createForTopic(forumId, topicId);
        return testForForumObject(id);
      });

      it('replies', function() {
        var id = ForumObject.createForReply(forumId, topicId, replyId);
        return testForForumObject(id);
      });

    });

    describe('createSubscriptionVisitorForUser', function() {
      it('should handle empty arrays', function() {
        var forumId = new ObjectID();
        var userId1 = new ObjectID();
        var id = ForumObject.createForForum(forumId);

        return subscriberService.createSubscriptionVisitorForUser(userId1, ForumObject.TYPE.Forum, [])
          .then(function(subscriptionVisitor) {
            assert.strictEqual(subscriptionVisitor.isSubscribed(id), false);
          })

      });

      it('should handle multiple items', function() {
        var forumId = new ObjectID();
        var topicId = new ObjectID();
        var replyId1 = new ObjectID();
        var replyId2 = new ObjectID();
        var replyId3 = new ObjectID();
        var userId1 = new ObjectID();

        var id1 = ForumObject.createForReply(forumId, topicId, replyId1);
        var id2 = ForumObject.createForReply(forumId, topicId, replyId2);
        var id3 = ForumObject.createForReply(forumId, topicId, replyId3);

        return subscriberService.addSubscriber(id1, userId1)
          .then(function() {
            return subscriberService.addSubscriber(id2, userId1)
          })
          .then(function() {
            return subscriberService.createSubscriptionVisitorForUser(userId1, ForumObject.TYPE.Reply, [id1, id2, id3])
          })
          .then(function(subscriptionVisitor) {
            assert.strictEqual(subscriptionVisitor.isSubscribed(id1), true);
            assert.strictEqual(subscriptionVisitor.isSubscribed(id2), true);
            assert.strictEqual(subscriptionVisitor.isSubscribed(id3), false);
          });
      });

      it('should return correct results when the user is subscribed to a forum but not a topic', function() {
        var forumId = new ObjectID();
        var topicId = new ObjectID();
        var userId1 = new ObjectID();

        var idForum = ForumObject.createForForum(forumId);
        var idTopic = ForumObject.createForTopic(forumId, topicId);

        return subscriberService.addSubscriber(idForum, userId1)
          .then(function() {
            return subscriberService.removeSubscriber(idTopic, userId1);
          })
          .then(function() {
            return subscriberService.createSubscriptionVisitorForUser(userId1, ForumObject.TYPE.Topic, [idTopic])
          })
          .then(function(subscriptionVisitor) {
            assert.strictEqual(subscriptionVisitor.isSubscribed(idTopic), false);
          });
      });

      it('should return correct results when the user is subscribed to a topic but not a forum', function() {
        var forumId = new ObjectID();
        var topicId = new ObjectID();
        var userId1 = new ObjectID();

        var idForum = ForumObject.createForForum(forumId);
        var idTopic = ForumObject.createForTopic(forumId, topicId);

        return subscriberService.addSubscriber(idTopic, userId1)
          .then(function() {
            return subscriberService.createSubscriptionVisitorForUser(userId1, ForumObject.TYPE.Forum, [idForum])
          })
          .then(function(subscriptionVisitor) {
            assert.strictEqual(subscriptionVisitor.isSubscribed(idForum), false);
          });
      });
    })
  });

});
