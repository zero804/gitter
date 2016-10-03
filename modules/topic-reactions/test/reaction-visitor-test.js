'use strict';

var assert = require('assert');
var reactionService = require('../lib/reaction-service');
var reactionVisitor = require('../lib/reaction-visitor');
var ObjectID = require('mongodb').ObjectID;
var ForumObject = require('gitter-web-topic-models/lib/forum-object');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('reaction-visitor-service', function() {
  var forumId = new ObjectID();
  var topicId1 = new ObjectID();
  var replyId1 = new ObjectID();
  var commentId1 = new ObjectID();
  var topicId2 = new ObjectID();
  var replyId2 = new ObjectID();
  var commentId2 = new ObjectID();
  var userId = new ObjectID();


  var topicRef1 = ForumObject.createForTopic(forumId, topicId1);
  var replyRef1 = ForumObject.createForReply(forumId, topicId1, replyId1);
  var commentRef1 = ForumObject.createForComment(forumId, topicId1, replyId1, commentId1);

  var topicRef2 = ForumObject.createForTopic(forumId, topicId2);
  var replyRef2 = ForumObject.createForReply(forumId, topicId2, replyId2);
  var commentRef2 = ForumObject.createForComment(forumId, topicId2, replyId2, commentId2);

  describe('integration tests #slow', function() {
    fixtureLoader.disableMongoTableScans();

    var FIXTURES = [{
      name: 'topic',
      refs: [topicRef1, topicRef2]
    }, {
      name: 'reply',
      refs: [replyRef1, replyRef2]
    }, {
      name: 'comment',
      refs: [commentRef1, commentRef2]
    }];

    FIXTURES.forEach(function(meta) {
      it('should work with single ' + meta.name + ' items', function() {
        var ref = meta.refs[0];

        return reactionService.addReaction(ref, userId, 'like')
          .then(function() {
            return reactionVisitor(userId, ref.type, [ref]);
          })
          .then(function(visitor) {
            assert.deepEqual(visitor.getReactions(ref), { like: 1 });
          })
      });

      it('should work with arrays of ' + meta.name + ' items', function() {
        var ref = meta.refs[0];
        var refs = meta.refs;

        return reactionService.addReaction(ref, userId, 'like')
          .then(function() {
            return reactionVisitor(userId, ref.type, refs);
          })
          .then(function(visitor) {
            assert.deepEqual(visitor.getReactions(ref), { like: 1 });
            assert.deepEqual(visitor.getReactions(meta.refs[1]), { });
          })
      });
    })
  });

  it('should work with empty queries', function() {
    return reactionVisitor(userId, ForumObject.TYPE.Comment, [])
      .then(function(visitor) {
        assert.deepEqual(visitor.getReactions(commentRef1), { });
      });
  });

});
