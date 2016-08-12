'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('topic-api', function() {
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
    }
  });

  it('POST /v1/forums/:forumId/topics', function() {
    return request(app)
      .post('/v1/forums/' + fixture.forum1.id + '/topics')
      .send({
        categoryId: fixture.category1.id,
        title: 'I am a topic',
        text: 'This is some **markdown** copy.'
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var topic = result.body;
        assert.strictEqual(topic.title, 'I am a topic');
      });
  });

  it('POST /v1/forums/:forumId/topics/:topicId/replies', function() {
    return request(app)
      .post('/v1/forums/' + fixture.forum1.id + '/topics/' + fixture.topic1.id + '/replies')
      .send({
        text: 'I am a reply.'
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var reply = result.body;
        assert.strictEqual(reply.text, 'I am a reply.');
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
        assert.strictEqual(comment.text, 'I am a comment.');
      });
  });
});
