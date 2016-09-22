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
      category: 'category1',
    },
    topic2: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1',
      tags: ['foo']
    },
    reply1: {
      user: 'user1',
      forum: 'forum1',
      topic: 'topic1'
    }
  });

  it('GET /v1/forums/:forumId/topics', function() {
    return request(app)
      .get('/v1/forums/' + fixture.forum1.id + '/topics')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var topics = result.body;

        assert.strictEqual(topics.length, 2);

        var topic = topics.find(function(t) {
          return t.id === fixture.topic1.id;
        });
        assert.strictEqual(topic.id, fixture.topic1.id);
        assert.strictEqual(topic.replies.length, 1);
      });
  });

  it('GET /v1/forums/:forumId/topics?tags=foo', function() {
    return request(app)
      .get('/v1/forums/' + fixture.forum1.id + '/topics?tags=foo')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var topics = result.body;

        assert.strictEqual(topics.length, 1);

        var topic = topics.find(function(t) {
          return t.id === fixture.topic2.id;
        });
        assert.strictEqual(topic.id, fixture.topic2.id);
        assert.strictEqual(topic.replies.length, 0);
      });

  });

  it('GET /v1/forums/:forumId/topics/:topicId', function() {
    return request(app)
      .get('/v1/forums/' + fixture.forum1.id + '/topics/' + fixture.topic1.id)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var topic = result.body;
        assert.strictEqual(topic.id, fixture.topic1.id);
        assert.strictEqual(topic.replies.length, 1);
      });
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

  it('GET /v1/forums/:forumId/topics/:topicId/subscribers', function() {
    return request(app)
      .get('/v1/forums/' + fixture.forum1.id + '/topics/' + fixture.topic1.id + '/subscribers')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var body = result.body;
        assert(Array.isArray(body))
      });
  });

  it('POST /v1/forums/:forumId/topics/:topicId/subscribers', function() {
    return request(app)
      .post('/v1/forums/' + fixture.forum1.id + '/topics/' + fixture.topic1.id + '/subscribers')
      .send({
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var body = result.body;
        assert.strictEqual(body.id, fixture.user1.id)
      });
  });

  it('DELETE /v1/forums/:forumId/topics/:topicId/subscribers', function() {
    return request(app)
      .del('/v1/forums/' + fixture.forum1.id + '/topics/' + fixture.topic1.id + '/subscribers/' + fixture.user1.id)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(204)
  });

});
