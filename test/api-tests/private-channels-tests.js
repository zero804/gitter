'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('private-create-channel-api', function() {
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
    group1: {},
    troupe1: {}
  });

  function post(permissions) {
    return request(app)
      .post('/v1/private/channels')
      .send({
        ownerUri: fixtureLoader.GITTER_INTEGRATION_ORG,
        name: 'Test' + Date.now(),
        security: permissions
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200);
  }

  describe('INHERITED permissions', function() {

    it('POST /v1/private/channels - inherited permissions', function() {
      return post('INHERITED');
    });

  });

  describe('PUBLIC permissions', function() {

    it('POST /v1/private/channels', function() {
      return post('PUBLIC');
    });

  });

  describe('PRIVATE permissions', function() {

    it('POST /v1/private/channels', function() {
      return post('PUBLIC');
    });

  });

})
