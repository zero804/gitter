'use strict';

process.env.DISABLE_API_LISTEN = '1';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('user-orgs #slow', function() {
  var app, request;

  fixtureLoader.ensureIntegrationEnvironment(
    '#integrationUser1',
    'GITTER_INTEGRATION_ORG',
    '#oauthTokens'
  );

  before(function() {
    if (this._skipFixtureSetup) return;

    request = require('supertest');
    app = require('../../server/api');
  });

  var fixture = fixtureLoader.setup({
    deleteDocuments: {
      Group: [
        { 'sd.type': 'GH_ORG', 'sd.linkPath': fixtureLoader.GITTER_INTEGRATION_ORG },
        { lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() }
      ],
      Troupe: [
        { 'sd.type': 'GH_ORG', 'sd.linkPath': fixtureLoader.GITTER_INTEGRATION_ORG },
        { lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() + '/community' }
      ]
    },
    user1: '#integrationUser1'
  });

  it('GET /v1/user/:userId/orgs', function() {
    return request(app)
      .get('/v1/user/' + fixture.user1.id + '/orgs')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var orgs = result.body;

        assert(
          orgs.some(function(org) {
            return org.name === fixtureLoader.GITTER_INTEGRATION_ORG;
          })
        );
      });
  });
});
