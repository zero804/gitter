"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var testRequire = require('../../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assertUtils = require('../../assert-utils')
var serialize = require('gitter-web-serialization/lib/serialize');
var CommentStrategy = testRequire('./serializers/rest/comment-strategy');
var persistence = require('gitter-web-persistence');
var reactionService = require('gitter-web-topic-reactions/lib/reaction-service');
var ForumObject = require('gitter-web-topic-models/lib/forum-object');

var LONG_AGO = '2014-01-01T00:00:00.000Z';

function makeHash() {
  var hash = {};
  for(var i = 0; i < arguments.length; i = i + 2) {
    hash[arguments[i]] = arguments[i + 1];
  }
  return hash;
}

describe('CommentStrategy #slow', function() {
  var blockTimer = require('../../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = fixtureLoader.setup({
    user1: {},
    forum1: {},
    category1: {
      forum: 'forum1'
    },
    topic1: {
      forum: 'forum1',
      category: 'category1',
      user: 'user1',
    },
    reply1: {
      forum: 'forum1',
      category: 'category1',
      user: 'user1',
      topic: 'topic1',
    },
    comment1: {
      forum: 'forum1',
      category: 'category1',
      user: 'user1',
      topic: 'topic1',
      reply: 'reply1',
      sent: new Date(LONG_AGO)
    },
    comment2: {
      forum: 'forum1',
      category: 'category1',
      user: 'user1',
      topic: 'topic1',
      reply: 'reply1',
      sent: new Date(LONG_AGO)
    }
  });

  it('should serialize a comment', function() {
    var strategy = CommentStrategy.standard();

    var comment = fixture.comment1;
    var user = fixture.user1;

    return serialize([comment], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: comment.id,
          body: {
            text: comment.text,
            html: comment.html,
          },
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl:  nconf.get('avatar:officialHost') + '/g/u/' + user.username,
          },
          reactions: {},
          sent: LONG_AGO,
          editedAt: null,
          lastChanged: LONG_AGO,
          v: 1
        }])
      });
  });

  it('should serialize a comment with a userId', function() {
    var strategy = CommentStrategy.standard({
      currentUserId: fixture.user1._id
    });

    var comment = fixture.comment1;
    var user = fixture.user1;

    return serialize([comment], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: comment.id,
          body: {
            text: comment.text,
            html: comment.html,
          },
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl:  nconf.get('avatar:officialHost') + '/g/u/' + user.username,
          },
          reactions: {},
          ownReactions: {},
          sent: LONG_AGO,
          editedAt: null,
          lastChanged: LONG_AGO,
          v: 1
        }])
      });
  });

  it('should serialize a comment with a userId with reactions', function() {
    var comment = fixture.comment1;
    var user = fixture.user1;

    return reactionService.addReaction(ForumObject.createForComment(comment.forumId, comment.topicId, comment.replyId, comment._id), user._id, 'like')
      .then(function() {
        return persistence.Comment.findById(comment._id);
      })
      .then(function(comment) {
        var strategy = CommentStrategy.standard({
          currentUserId: fixture.user1._id
        });

        return serialize([comment], strategy)
      })
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: comment.id,
          body: {
            text: comment.text,
            html: comment.html,
          },
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl:  nconf.get('avatar:officialHost') + '/g/u/' + user.username,
          },
          reactions: {
            like: 1
          },
          ownReactions: {
            like: true
          },
          sent: LONG_AGO,
          editedAt: null,
          lastChanged: LONG_AGO,
          v: 1
        }])
      });
  });

  it("should serialize a reply with lookups=['user']", function() {
    var strategy = CommentStrategy.standard({ lookups: ['user'] });

    var comment = fixture.comment1;
    var user = fixture.user1;

    return serialize([comment], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, {
          items: [{
            id: comment.id,
            body: {
              text: comment.text,
              html: comment.html,
            },
            user: fixture.user1.id,
            reactions: {},
            sent: LONG_AGO,
            editedAt: null,
            lastChanged: LONG_AGO,
            v: 1
          }],
          lookups: {
            users: makeHash(fixture.user1.id, {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatarUrl:  nconf.get('avatar:officialHost') + '/g/u/' + user.username,
            })
          }
        })
      });
  });
});
