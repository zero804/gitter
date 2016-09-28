'use strict';

var assert = require('assert');
var reactionService = require('../lib/reaction-service');
var ObjectID = require('mongodb').ObjectID;
var ForumObject = require('gitter-web-topic-models/lib/forum-object');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('reaction-service', function() {

  describe('integration tests #slow', function() {
    fixtureLoader.disableMongoTableScans();

    var forumId = new ObjectID();
    var topicId = new ObjectID();
    var replyId = new ObjectID();
    var commentId = new ObjectID();
    var userId = new ObjectID();

    var FIXTURE = [{
      name: 'topic',
      ref: ForumObject.createForTopic(forumId, topicId)
    },{
      name: 'reply',
      ref: ForumObject.createForReply(forumId, topicId, replyId)
    },{
      name: 'comment',
      ref: ForumObject.createForComment(forumId, topicId, replyId, commentId)
    }];

    FIXTURE.forEach(function(meta) {
      describe(meta.name, function() {

        it('should allow liking an disliking idempotently', function() {
          return reactionService.addReaction(meta.ref, userId, 'like')
            .then(function(result) {
              assert.strictEqual(result, true);
              return reactionService.addReaction(meta.ref, userId, 'like')
            })
            .then(function(result) {
              assert.strictEqual(result, false);
              return reactionService.removeReaction(meta.ref, userId, 'like')
            })
            .then(function(result) {
              assert.strictEqual(result, true);
              return reactionService.removeReaction(meta.ref, userId, 'like')
            })
            .then(function(result) {
              assert.strictEqual(result, false);
            })

        });
      });
    });
  });

});
