'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var request = require('supertest-as-promised')(Promise);

var app = require('../../server/web');

describe('topic-export-api', function() {
  fixtureLoader.ensureIntegrationEnvironment('#oauthTokens');

  before(function() {
    if(this._skipFixtureSetup) return;
  });

  var fixture = fixtureLoader.setup({
    userAdmin1: {
      accessToken: 'web-internal'
    },
    userNoExport1: {
      accessToken: 'web-internal'
    },
    forum1: {
      securityDescriptor: {
        extraAdmins: ['userAdmin1']
      }
    },
    category1: {
      forum: 'forum1'
    },
    topic1: {
      user: 'userAdmin1',
      forum: 'forum1',
      category: 'category1',
    },
    topic2: {
      user: 'userNoExport1',
      forum: 'forum1',
      category: 'category1'
    },
    topicOtherForum3: {
      user: 'userAdmin1',
      forum: 'forum2',
      category: 'category1'
    },
    reply1: {
      user: 'userAdmin1',
      forum: 'forum1',
      topic: 'topic1'
    }
  });

  it('GET /api_web/export/forums/:forum/topics.ndjson unauthorized returns nothing', function() {
    return request(app)
      .get(`/api_web/export/forums/${fixture.forum1.id}/topics.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .expect(401)
      .then(function(result) {
        assert.deepEqual(result.body, { success: false, loginRequired: true });
      });
  });

  it('GET /api_web/export/forums/:forum/topics.ndjson forbidden returns nothing', function() {
    return request(app)
      .get(`/api_web/export/forums/${fixture.forum1.id}/topics.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.userNoExport1.accessToken}`)
      .expect(403)
      .then(function(result) {
        assert.deepEqual(result.body, { "error": "Forbidden" });
      });
  });

  it('GET /api_web/export/forums/:forum/topics.ndjson as <img> does not work', function() {
    return request(app)
      .get(`/api_web/export/forums/${fixture.forum1.id}/topics.ndjson`)
      .set('Accept', 'image/*')
      .set('Authorization', `Bearer ${fixture.userAdmin1.accessToken}`)
      .expect(406)
      .then(function(result) {
        assert.deepEqual(result.body, {});
      });
  });

  it('GET /api_web/export/forums/:forum/topics.ndjson as admin gets data', function() {
    return request(app)
      .get(`/api_web/export/forums/${fixture.forum1.id}/topics.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.userAdmin1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(result.text.split('\n').length, 3, 'includes 2 topics (extra newline at the end)');
        assert(result.text.includes(fixture.topic1.id), 'includes topic1');
        assert(result.text.includes(fixture.topic2.id), 'includes topic2');
        assert(!result.text.includes(fixture.topicOtherForum3.id), 'does not include topicOtherForum3');
        assert(result.text.includes(fixture.reply1.id), 'includes reply1');
      });
  });
});
