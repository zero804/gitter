'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

describe('room-api', function() {
  var app, request;

  before(function() {
    request = require("supertest-as-promised")(Promise);
    app = require('../../server/api');
  });

  var fixture = fixtureLoader.setup({
    deleteDocuments: {
      User: [{
        username: fixtureLoader.GITTER_INTEGRATION_USERNAME
      }, {
        username: fixtureLoader.GITTER_INTEGRATION_COLLAB_USERNAME
      }],
      Group: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() }],
      Troupe: [
        { lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() },
        { lcUri: fixtureLoader.GITTER_INTEGRATION_REPO_WITH_COLLAB.toLowerCase() }
      ]
    },
    user1: {
      githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN,
      username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
      accessToken: 'web-internal'
    },
    user2: {
      githubToken: fixtureLoader.GITTER_INTEGRATION_COLLAB_USER_SCOPE_TOKEN,
      username: fixtureLoader.GITTER_INTEGRATION_COLLAB_USERNAME,
      accessToken: 'web-internal'
    },
    group1: {
    },
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
      })
  })


})
