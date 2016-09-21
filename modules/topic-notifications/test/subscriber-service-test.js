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
        return subscriberService.addSubscriber(id, userId1)
          .then(function(result) {
            assert.strictEqual(result, true);
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

  });

});
