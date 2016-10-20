'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('category-api', function() {
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
    // for retrieving (and you can't delete it because it has a topic)
    category1: {
      forum: 'forum1'
    },
    // for updating
    category2: {
      forum: 'forum1'
    },
    // for deleting (because it is empty)
    category3: {
      forum: 'forum1'
    },
    topic1: {
      user: 'user1',
      forum: 'forum1',
      category: 'category1'
    }
  });

  it('GET /v1/forums/:forumId/categories', function() {
    return request(app)
      .get('/v1/forums/' + fixture.forum1.id + '/categories')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var categories = result.body;

        var category = categories.find(function(c) {
          return c.id === fixture.category1.id;
        });
        assert.deepStrictEqual(category, {
          id: category.id,
          name: category.name,
          slug: category.slug,
          adminOnly: false,
          v: 1
        });
      });
  });

  it('GET /v1/forums/:forumId/categories/:categoryId', function() {
    return request(app)
      .get('/v1/forums/' + fixture.forum1.id + '/categories/' + fixture.category1.id)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var category = result.body;
        assert.deepStrictEqual(category, {
          id: fixture.category1.id,
          name: fixture.category1.name,
          slug: fixture.category1.slug,
          adminOnly: false,
          v: 1
        });
      });
  });

  it('PATCH /v1/forums/:forumId/categories/:categoryId', function() {
    var update = {
      name: 'Foo',
      slug: 'cats',
      adminOnly: true
    };
    return request(app)
      .patch('/v1/forums/' + fixture.forum1.id + '/categories/' + fixture.category2.id)
      .send(update)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var category = result.body;

        assert.strictEqual(category.name, update.name);
        assert.strictEqual(category.slug, update.slug);
        assert.strictEqual(category.adminOnly, update.adminOnly);
      });
  });

  it('PATCH /v1/forums/:forumId/categories/:categoryId with an empty body', function() {
    return request(app)
      .patch('/v1/forums/' + fixture.forum1.id + '/categories/' + fixture.category2.id)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200);
  });

  it('POST /v1/forums/:forumId/categories', function() {
    return request(app)
      .post('/v1/forums/' + fixture.forum1.id + '/categories')
      .send({
        name: "I am a category"
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var category = result.body;
        assert.strictEqual(category.name, "I am a category");
      });
  });

  it('DELETE /v1/forums/:forumId/categories/:categoryId (non-empty)', function() {
    var category = fixture.category1;
    return request(app)
      .del('/v1/forums/' + category.forumId + '/categories/' + category.id)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(409);
  });

  it('DELETE /v1/forums/:forumId/categories/:categoryId (empty)', function() {
    var category = fixture.category3;
    return request(app)
      .del('/v1/forums/' + category.forumId + '/categories/' + category.id)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(204);
  });
});
