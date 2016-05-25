'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var fixtureLoader = require('../integration/test-fixtures');
var assert = require('assert');

describe('group-api', function() {
  var app, request;

  before(function() {
    request = require("supertest-as-promised")(Promise);
    app = require('../../server/api');
  });

  var fixture = {};
  before(fixtureLoader(fixture, {
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
    troupe1: { group: 'group1' }
  }));

  after(function() {
    return fixture.cleanup();
  });

  it('GET /v1/groups', function() {
    return request(app)
      .get('/v1/groups')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
  });

  it('POST /v1/groups', function() {
    return request(app)
      .post('/v1/groups')
      .send({ uri: fixtureLoader.GITTER_INTEGRATION_ORG, name: 'Test' })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
  });

  it('GET /v1/groups/:groupId/rooms', function() {
    return request(app)
      .get('/v1/groups/' + fixture.group1.id + '/rooms')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        assert(result.body.length == 0);
      })
  });


})
