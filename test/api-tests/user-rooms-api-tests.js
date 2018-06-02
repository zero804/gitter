'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

describe('user-rooms-api', function() {
  var app, request;

  fixtureLoader.ensureIntegrationEnvironment('#oauthTokens');

  before(function() {
    if(this._skipFixtureSetup) return;

    request = require('supertest-as-promised')(Promise);
    app = require('../../server/api');
  });

  fixtureLoader.ensureIntegrationEnvironment(
    '#integrationUser1',
    'GITTER_INTEGRATION_ORG'
  );

  var fixture = fixtureLoader.setup({
    deleteDocuments: {
      Group: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() }],
    },
    user1: '#integrationUser1',
    troupe1: {
      security: 'PUBLIC',
      users: ['user1']
    },
    troupe2: {
      security: 'PRIVATE',
      users: ['user1']
    },
  });

  it('GET /v1/user/:userId/rooms', function() {
    return request(app)
      .get(`/v1/user/${fixture.user1.id}/rooms`)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var rooms = result.body;

        assert(rooms.some(function(r) {
          return r.id === fixture.troupe1.id;
        }));

        assert(rooms.some(function(r) {
          return r.id === fixture.troupe2.id;
        }));

        assert.strictEqual(rooms.length, 2);
      });
  });

  it('GET /v1/user/:userId/rooms/:roomId/unreadItems', function() {
    return request(app)
      .get(`/v1/user/${fixture.user1.id}/rooms/${fixture.troupe1.id}/unreadItems`)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var { chat, mention } = result.body;

        assert.strictEqual(chat.length, 0);
        assert.strictEqual(mention.length, 0);
      });
  });

})
