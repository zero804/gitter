'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

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
      Group: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() },
              { lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() } ],
      Troupe: [ {lcUri: fixtureLoader.GITTER_INTEGRATION_REPO.toLowerCase()}]
    },
    user1: {
      githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN,
      username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
      accessToken: 'web-internal'
    },
    group1: {
      securityDescriptor: {
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

  it('POST /v1/groups (new style community)', function() {
    return request(app)
      .post('/v1/groups')
      .send({ uri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY, name: 'Test' })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
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
        name: 'test',
        topic: 'all about testing',
        security: {
          security: 'INHERIT',
          type: 'GH_REPO',
          linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME + '/' + fixtureLoader.GITTER_INTEGRATION_REPO
        }
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200);
  });
});
