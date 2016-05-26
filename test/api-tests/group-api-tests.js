'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var fixtureLoader = require('../integration/test-fixtures');
var assert = require('assert');

describe('group-api', function() {
  this.timeout(10000);

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
    troupe1: {
      security: 'PUBLIC',
      group: 'group1'
    },
    troupe2: {
      security: 'PRIVATE',
      group: 'group1'
    },
    troupe3: {
      /* Security is undefined */
      group: 'group1'
    }
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
        var rooms = result.body;

        assert(rooms.some(function(r) {
          return r.id === fixture.troupe1.id;
        }));

        assert(rooms.every(function(r) {
          return r.id !== fixture.troupe2.id;
        }));

        assert(rooms.every(function(r) {
          return r.id !== fixture.troupe3.id;
        }));

        assert(result.body.length > 0);
      })
  });


})
