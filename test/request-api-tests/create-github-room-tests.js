'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

describe('create-github-room-api', function() {
  var app, request;

  fixtureLoader.ensureIntegrationEnvironment(
    '#integrationUser1',
    '#integrationCollabUser1',
    'GITTER_INTEGRATION_ORG',
    'GITTER_INTEGRATION_REPO_WITH_COLLAB',
    '#oauthTokens'
  );

  before(function() {
    if (this._skipFixtureSetup) return;

    request = require('supertest-as-promised')(Promise);
    app = require('../../server/api');
  });

  var fixture = fixtureLoader.setup({
    deleteDocuments: {
      Group: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() }],
      Troupe: [
        { lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() },
        { lcUri: fixtureLoader.GITTER_INTEGRATION_REPO_WITH_COLLAB.toLowerCase() }
      ]
    },
    user1: '#integrationUser1',
    user2: '#integrationCollabUser1',
    group1: {},
    troupe1: {
      security: 'PUBLIC',
      users: ['user1'],
      group: 'group1'
    }
  });

  it('POST /private/create-github-room', function() {
    return request(app)
      .post('/private/create-github-room')
      .send({
        uri: fixtureLoader.GITTER_INTEGRATION_REPO_WITH_COLLAB
      })
      .set('x-access-token', fixture.user2.accessToken)
      .expect(200)
      .then(function(result) {
        var body = result.body;
        assert.strictEqual(body.uri, fixtureLoader.GITTER_INTEGRATION_REPO_WITH_COLLAB);

        return request(app)
          .post('/private/create-github-room')
          .send({
            uri: fixtureLoader.GITTER_INTEGRATION_REPO_WITH_COLLAB
          })
          .set('x-access-token', fixture.user1.accessToken)
          .expect(200);
      });
  });
});
