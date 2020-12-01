'use strict';

process.env.DISABLE_MATRIX_BRIDGE = '1';
process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');
const eventService = require('gitter-web-events');

describe('room-integration-events-export-api', function() {
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

  it('GET /api_web/export/rooms/:room_id/integration-events.ndjson as admin works', async () => {
    const event1 = await eventService.newEventToTroupe(
      fixture.troupe1,
      fixture.user1,
      'some integration event',
      {
        foo: 'bar'
      },
      {
        somepayload: 'mhmmm'
      }
    );
    const event2 = await eventService.newEventToTroupe(
      fixture.troupe1,
      fixture.user1,
      'other integration event',
      {
        qux: 'zzz'
      },
      {
        otherpayload: 'yeap'
      }
    );

    const eventNoExport1 = await eventService.newEventToTroupe(
      fixture.troupeNoExport1,
      fixture.userNoExport1,
      'no export integration event',
      {
        no: 'uhhh'
      },
      {}
    );

    return request(app)
      .get(`/api_web/export/rooms/${fixture.troupe1.id}/integration-events.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(
          result.text.split('\n').length,
          3,
          'includes 2 events (extra newline at the end)'
        );
        assert(result.text.includes(event1._id), 'includes event1');
        assert(result.text.includes(event2._id), 'includes event2');
        assert(!result.text.includes(eventNoExport1._id), 'does not include eventNoExport1');
      });
  });
});
