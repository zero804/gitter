'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

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
      tags: ['cats', 'dogs'],
      securityDescriptor: {
        extraAdmins: ['user1']
      }
    },
    category1: {
      forum: 'forum1'
    },
    category2: {
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

        var topic = topics.find(function(t) {
          return t.id === fixture.topic1.id;
        });
        assert.strictEqual(topic.id, fixture.topic1.id);
        assert.strictEqual(topic.replies.length, 1);
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

  it('PATCH /v1/forums/:forumId/topics/:topicId', function() {
    var update = {
      title: 'Foo',
      slug: 'foo',
      tags: ['cats', 'dogs'],
      text: '**hello**',
      categoryId: fixture.category2._id
    };
    return request(app)
      .patch('/v1/forums/' + fixture.forum1.id + '/topics/' + fixture.topic2.id)
      .send(update)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var topic = result.body;

        assert.strictEqual(topic.title, update.title);
        assert.strictEqual(topic.slug, update.slug);
        assert.deepEqual(topic.tags, update.tags);
        assert.strictEqual(topic.body.text, update.text);
        assert.strictEqual(topic.body.html, '<strong>hello</strong>');
        assert(mongoUtils.objectIDsEqual(topic.category.id, update.categoryId));
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

});
