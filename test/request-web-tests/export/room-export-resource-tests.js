'use strict';

process.env.DISABLE_MATRIX_BRIDGE = '1';
process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');

describe('room-export-resource', function() {
  fixtureLoader.ensureIntegrationEnvironment('#oauthTokens');

  before(function() {
    if (this._skipFixtureSetup) return;
  });

  var fixture = fixtureLoader.setup({
    user1: {
      accessToken: 'web-internal'
    },
    userNoExport1: {
      accessToken: 'web-internal'
    },
    troupe1: {
      securityDescriptor: {
        admins: 'MANUAL',
        extraAdmins: ['user1']
      }
    }
  });

  it('GET /api_web/export/rooms/:room_id/messages.ndjson as admin works', function() {
    return request(app)
      .get(`/api_web/export/rooms/${fixture.troupe1.id}/messages.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200);
  });

  it('GET /api_web/export/rooms/:room_id/messages.ndjson as not admin is forbidden', function() {
    return request(app)
      .get(`/api_web/export/rooms/${fixture.troupe1.id}/messages.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.userNoExport1.accessToken}`)
      .expect(403)
      .then(function(result) {
        assert.deepEqual(result.body, { error: 'Forbidden' });
      });
  });
});
