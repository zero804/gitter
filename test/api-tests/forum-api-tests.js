'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('forum-api', function() {
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
    }
  });

  it('GET /v1/forums/:forumId', function() {
    return request(app)
      .get('/v1/forums/' + fixture.forum1.id)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var forum = result.body;
        assert.strictEqual(forum.id, fixture.forum1.id);
        assert.strictEqual(forum.topicsTotal, 1);
        assert.strictEqual(forum.categories.length, 1);
      });
  });

});
