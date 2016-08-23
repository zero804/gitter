
'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('comment-api', function() {
  var app, request;

  before(function() {
    request = require("supertest-as-promised")(Promise);
    app = require('../../server/api');
  });

  var fixture = fixtureLoader.setup({
    user1: {
      accessToken: 'web-internal'
    },
    forum1: {
      securityDescriptor: {
        extraAdmins: ['user1']
      }
    },
    category1: {
      forum: 'forum1'
    },
    topic1: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1'
    },
    reply1: {
      user: 'user1',
      forum: 'forum1',
      topic: 'topic1'
    },
    comment1: {
      user: 'user1',
      forum: 'forum1',
      topic: 'topic1',
      reply: 'reply1'
    }
  });

  it('GET /v1/forums/:forumId/topics/:topicId/replies/:replyId/comments', function() {
    return request(app)
      .get('/v1/forums/' + fixture.forum1.id + '/topics/' + fixture.topic1.id + '/replies/' + fixture.reply1.id + '/comments')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var comments = result.body;

        var comment = comments.find(function(c) {
          return c.id === fixture.comment1.id;
        });
        assert.strictEqual(comment.id, fixture.comment1.id);
      });
  });

  it('GET /v1/forums/:forumId/topics/:topicId/replies/:replyId/comments/:commentId', function() {
    return request(app)
      .get('/v1/forums/' + fixture.forum1.id + '/topics/' + fixture.topic1.id + '/replies/' + fixture.reply1.id + '/comments/' + fixture.comment1.id)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var comment = result.body;
        assert.strictEqual(comment.id, fixture.comment1.id);
      });
  });

  it('POST /v1/forums/:forumId/topics/:topicId/replies/:replyId/comments', function() {
    return request(app)
      .post('/v1/forums/' + fixture.forum1.id + '/topics/' + fixture.topic1.id + '/replies/' + fixture.reply1.id + '/comments')
      .send({
        text: 'I am a comment.'
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var comment = result.body;
        assert.strictEqual(comment.body.text, 'I am a comment.');
      });
  });

});
