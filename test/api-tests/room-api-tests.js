'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var _ = require('lodash');

describe('room-api', function() {
  var app, request;

  before(function() {
    request = require("supertest-as-promised")(Promise);
    app = require('../../server/api');
  });

/**
 * fixtureLoader.GITTER_INTEGRATION_COLLAB_USER_SCOPE_TOKEN = '***REMOVED***';
 fixtureLoader.GITTER_INTEGRATION_COLLAB_USERNAME = 'gitter-integration-tests-collaborator';
 fixtureLoader.GITTER_INTEGRATION_COLLAB_USER_ID = '20068982';
 */
  var fixture = fixtureLoader.setup({
    user1: {
      accessToken: 'web-internal'
    },
    user2: {
      accessToken: 'web-internal'
    },
    group1: { },
    troupe1: {
      security: 'PUBLIC',
      users: ['user1'],
      group: 'group1'
    }
  });

  it('GET /v1/rooms', function() {
    return request(app)
      .get('/v1/rooms')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var rooms = result.body;
        assert.strictEqual(rooms.length, 1);

        var t1 = rooms.filter(function(r) {
          return r.id === fixture.troupe1.id;
        })[0];

        assert(t1);
      });
  });

  it('GET /v1/rooms/:roomId', function() {
    return request(app)
      .get('/v1/rooms/' + fixture.troupe1.id)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var room = result.body;

        assert.deepEqual(_.pick(room, 'id', 'uri'), {
          id: fixture.troupe1.id,
          uri: fixture.troupe1.uri
        });

        assert.deepEqual(_.pick(room.group, 'id', 'uri'), {
          id: fixture.group1.id,
          uri: fixture.group1.uri
        });
      });
  });

  it('POST /v1/rooms/ with a room', function() {
    return request(app)
      .post('/v1/rooms')
      .send({
        uri: fixture.troupe1.uri
      })
      .set('x-access-token', fixture.user2.accessToken)
      .expect(200)
      .then(function(result) {
        var body = result.body;
        assert.strictEqual(body.uri, fixture.troupe1.uri);
      })
  })

  it('POST /v1/rooms/ with a user', function() {
    return request(app)
      .post('/v1/rooms')
      .send({
        uri: fixture.user1.username
      })
      .set('x-access-token', fixture.user2.accessToken)
      .expect(200)
      .then(function(result) {
        var body = result.body;
        assert.strictEqual(body.user.username, fixture.user1.username);
      })
  })


})
