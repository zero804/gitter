'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');


describe('group-api', function() {
  var app, request;

  before(function() {
    request = require("supertest-as-promised")(Promise);
    app = require('../../server/api');
  });

  var fixture = fixtureLoader.setup({
    deleteDocuments: {
      User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }],
      Group: [
        { lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() },
        { lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() },
        { lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() },
        { lcUri: 'repo-group' }
      ],
      Troupe: [
        { lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() + '/' + fixtureLoader.GITTER_INTEGRATION_REPO.toLowerCase() },
        { lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() + '/lobby' },
        { lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() + '/lobby' },
        { lcUri: 'repo-group/lobby' }
      ]
    },
    user1: {
      githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN,
      username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
      accessToken: 'web-internal'
    },
    group1: {
      uri: fixtureLoader.GITTER_INTEGRATION_USERNAME,
      lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase(),
      securityDescriptor: {
        type: 'GH_USER',
        admins: 'GH_USER_SAME',
        linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME,
        extraAdmins: ['user1']
      }
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
      group: 'group1',
      security: 'PRIVATE'
    }
  });

  it('GET /v1/groups', function() {
    return request(app)
      .get('/v1/groups')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
  });

  it('GET /v1/groups?type=admin', function() {
    return request(app)
      .get('/v1/groups?type=admin')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
  });

  it('POST /v1/groups (new style community)', function() {
    return request(app)
      .post('/v1/groups')
      .send({ uri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY, name: 'Test' })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var group = result.body;
        assert.strictEqual(group.uri, fixtureLoader.GITTER_INTEGRATION_COMMUNITY);
        assert.strictEqual(group.defaultRoom.uri, fixtureLoader.GITTER_INTEGRATION_COMMUNITY + '/Lobby');
      });
  });

  it('POST /v1/groups (github org based)', function() {
    return request(app)
      .post('/v1/groups')
      .send({
        uri: fixtureLoader.GITTER_INTEGRATION_ORG,
        name: 'Test',
        security: {
          type: 'GH_ORG',
          linkPath: fixtureLoader.GITTER_INTEGRATION_ORG
        }
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var group = result.body;
        assert.strictEqual(group.uri, fixtureLoader.GITTER_INTEGRATION_ORG);
        assert.strictEqual(group.defaultRoom.uri, fixtureLoader.GITTER_INTEGRATION_ORG + '/Lobby');
      });
  });

  it('POST /v1/groups (github repo based)', function() {
    return request(app)
      .post('/v1/groups')
      .send({
        name: 'Repo Group',
        uri: 'Repo-Group',
        providers: ['github'],
        addBadge: true,
        security: {
          type: 'GH_REPO',
          linkPath: fixtureLoader.GITTER_INTEGRATION_REPO_FULL
        }
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var group = result.body;
        assert.strictEqual(group.uri, 'Repo-Group');
        var room = group.defaultRoom;
        assert.strictEqual(room.uri, 'Repo-Group/Lobby');
        assert.strictEqual(room.providers.length, 1);
        assert.strictEqual(room.providers[0], 'github');
      });
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

        assert.strictEqual(result.body.length, 1);
      })
  });

  it('POST /v1/groups/:groupId/rooms', function() {
    return request(app)
      .post('/v1/groups/' + fixture.group1.id + '/rooms')
      .send({
        name: fixtureLoader.GITTER_INTEGRATION_REPO,
        topic: 'all about testing',
        providers: ['github'],
        security: {
          security: 'PRIVATE',
          type: 'GH_REPO',
          linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME + '/' + fixtureLoader.GITTER_INTEGRATION_REPO
        }
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var room = result.body;
        assert.strictEqual(room.providers.length, 1);
        assert.strictEqual(room.providers[0], 'github');
      });
  });
});
