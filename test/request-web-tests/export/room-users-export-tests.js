'use strict';

process.env.DISABLE_MATRIX_BRIDGE = '1';
process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');

describe('room-users-export-api', function() {
  fixtureLoader.ensureIntegrationEnvironment('#oauthTokens');

  before(function() {
    if (this._skipFixtureSetup) return;
  });

  var fixture = fixtureLoader.setup({
    user1: {
      accessToken: 'web-internal'
    },
    user2: {
      accessToken: 'web-internal'
    },
    userNoExport1: {
      accessToken: 'web-internal'
    },
    troupe1: {
      users: ['user1', 'user2'],
      securityDescriptor: {
        admins: 'MANUAL',
        extraAdmins: ['user1']
      }
    },
    troupeNoExport1: {
      users: ['userNoExport1']
    }
  });

  it('GET /api_web/export/rooms/:room_id/users.ndjson as admin works', function() {
    return request(app)
      .get(`/api_web/export/rooms/${fixture.troupe1.id}/users.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(
          result.text.split('\n').length,
          3,
          'includes 2 users (extra newline at the end)'
        );
        assert(result.text.includes(fixture.user1.id), 'includes user1');
        assert(result.text.includes(fixture.user2.id), 'includes user2');
        assert(
          result.text.includes(`"username":"${fixture.user1.username}"`),
          'make sure it serializes the user itself and not just raw troupe-user'
        );
        assert(!result.text.includes(fixture.userNoExport1.id), 'does not include userNoExport1');
      });
  });
});
