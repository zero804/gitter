'use strict';

process.env.DISABLE_MATRIX_BRIDGE = '1';
process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');

describe('room-bans-export-api', function() {
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
    user3: {
      accessToken: 'web-internal'
    },
    userNoExport1: {
      accessToken: 'web-internal'
    },
    troupe1: {
      users: ['user1'],
      securityDescriptor: {
        admins: 'MANUAL',
        extraAdmins: ['user1']
      }
    },
    troupeNoExport1: {
      users: ['userNoExport1']
    }
  });

  it('GET /api_web/export/rooms/:room_id/bans.ndjson as admin works', async () => {
    const ban1 = fixture.troupe1.addUserBan({
      userId: fixture.user2.id,
      bannedBy: fixture.user1.id
    });
    const ban2 = fixture.troupe1.addUserBan({
      userId: fixture.user3.id,
      bannedBy: fixture.user1.id
    });
    const banNoExport1 = fixture.troupeNoExport1.addUserBan({
      userId: fixture.userNoExport1.id,
      bannedBy: fixture.user1.id
    });

    await fixture.troupe1.save();
    await fixture.troupeNoExport1.save();

    return request(app)
      .get(`/api_web/export/rooms/${fixture.troupe1.id}/bans.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(
          result.text.split('\n').length,
          3,
          'includes 2 bans (extra newline at the end)'
        );

        assert(result.text.includes(`"user":{"id":"${ban1.userId}"`), 'includes banned user1');
        assert(
          result.text.includes(`"bannedBy":{"id":"${ban1.bannedBy}"`),
          'includes who banned the person'
        );
        assert(result.text.includes(`"user":{"id":"${ban2.userId}"`), 'includes banned user2');

        assert(
          !result.text.includes(`"user":{"id":"${banNoExport1.userId}"`),
          'does not include banNoExport1'
        );
      });
  });
});
