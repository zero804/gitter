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
    user3: {
      accessToken: 'web-internal'
    },
    group1: { },
    troupe1: {
      security: 'PUBLIC',
      users: ['user1'],
      securityDescriptor: {
        extraAdmins: ['user3'],
      },
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

  it('GET /v1/rooms/:roomId/issues', function() {
    return request(app)
      .get('/v1/rooms/' + fixture.troupe1.id + '/issues')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var issues = result.body;

        assert.deepEqual(issues, []);
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
  });

  it('GET /v1/rooms/:roomId/suggestedRooms', function() {
    return request(app)
      .get('/v1/rooms/' + fixture.troupe1.id + '/suggestedRooms')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        // For now, this is a very loose test, to prove
        // https://github.com/troupe/gitter-webapp/pull/2067
        // We can extend it later
        var suggestions = result.body;
        assert(Array.isArray(suggestions));
        suggestions.forEach(function(suggestion) {
          assert(suggestion.hasOwnProperty('uri'));
          assert(suggestion.hasOwnProperty('avatarUrl'));
          assert(suggestion.hasOwnProperty('userCount'));
          assert(suggestion.hasOwnProperty('tags'));
          assert(suggestion.hasOwnProperty('description'));
          assert(suggestion.hasOwnProperty('exists'));
          assert(suggestion.exists === true && suggestion.id || suggestion.exists === false && !suggestion.id);
        });
      });
  });

  it('PUT /v1/rooms/:roomId with {providers: []}', function() {
    var room = fixture.troupe1;

    return request(app)
      .put('/v1/rooms/' + room.id)
      .send({
        providers: []
      })
      .set('x-access-token', fixture.user3.accessToken)
      .expect(200);
  });

})
