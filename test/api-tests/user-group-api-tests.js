'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

describe('user-group-api', function() {
  var app, request;

  before(function() {
    request = require("supertest-as-promised")(Promise);
    app = require('../../server/api');
  });

  var fixture = fixtureLoader.setup({
    deleteDocuments: {
      User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }],
      Group: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() }],
    },
    user1: {
      githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN,
      username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
      accessToken: 'web-internal'
    },
    group1: {
    },
    group2: {
    },
    troupe1: {
      security: 'PUBLIC',
      group: 'group1',
      users: ['user1']
    },
    troupe2: {
      security: 'PRIVATE',
      group: 'group1',
      users: ['user1']
    },
    troupe3: {
      /* Security is undefined */
      group: 'group2',
      users: ['user1']
    }
  });

  it('GET /v1/user/:userId/groups', function() {
    return request(app)
      .get('/v1/groups')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var groups = result.body;

        assert(groups.some(function(r) {
          return r.id === fixture.group1.id;
        }));

        assert(groups.some(function(r) {
          return r.id === fixture.group2.id;
        }));


        assert.strictEqual(result.body.length, 2);
      });
  });


})
