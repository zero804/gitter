'use strict';

var assert = require('assert');
var reactionService = require('../lib/reaction-service');
var ForumObject = require('gitter-web-topic-models/lib/forum-object');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('reaction-service', function() {

  describe('integration tests #slow', function() {
    fixtureLoader.disableMongoTableScans();

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
        sent: new Date('2014-01-01T00:00:00.000Z')
      },
      reply1: {
        forum: 'forum1',
        category: 'category1',
        user: 'user1',
        topic: 'topic1',
        sent: new Date('2014-01-01T00:00:00.000Z')
      },
      comment1: {
        user: 'user1',
        forum: 'forum1',
        topic: 'topic1',
        reply: 'reply1'
      }
    });

    var FIXTURE = [{
      name: 'topic',
      ref: function() {
        return ForumObject.createForTopic(fixture.forum1._id, fixture.topic1._id);
      }
    },{
      name: 'reply',
      ref: function() {
        return ForumObject.createForReply(fixture.forum1._id, fixture.topic1._id, fixture.reply1._id)
      }
    },{
      name: 'comment',
      ref: function() {
        return ForumObject.createForComment(fixture.forum1._id, fixture.topic1._id, fixture.reply1._id, fixture.comment1._id)
      }
    }];

    FIXTURE.forEach(function(meta) {
      describe(meta.name, function() {

        it('should allow liking an disliking idempotently', function() {
          var ref = meta.ref();
          var userId = fixture.user1._id;

          function find() {
            var Model = ref.type.model;
            var query = ref.getQuery();

            return Model.findOne(query)
              .lean()
              .exec();
          }

          return reactionService.addReaction(ref, userId, 'like')
            .then(function(result) {
              assert.deepEqual(result, { like: 1 });
              return find();
            })
            .then(function(o) {
              assert.strictEqual(o.reactionCounts.like, 1);
              return reactionService.addReaction(ref, userId, 'like')
            })
            .then(function(result) {
              assert.strictEqual(result, null);
              return find();
            })
            .then(function(o){
              assert.strictEqual(o.reactionCounts.like, 1);
              return reactionService.removeReaction(ref, userId, 'like')
            })
            .then(function(result) {
              assert.deepEqual(result, { like: 0 });
              return find();
            })
            .then(function(o) {
              assert.strictEqual(o.reactionCounts.like, 0);
              return reactionService.removeReaction(ref, userId, 'like')
            })
            .then(function(result) {
              assert.strictEqual(result, null);
              return find();
            })
            .then(function(o) {
              assert.strictEqual(o.reactionCounts.like, 0);
            })

        });
      });
    });
  });

});
