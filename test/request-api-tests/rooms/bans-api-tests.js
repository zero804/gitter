'use strict';

process.env.DISABLE_MATRIX_BRIDGE = '1';
process.env.DISABLE_API_LISTEN = '1';

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');

describe('bans-api', function() {
  let app, request;

  fixtureLoader.ensureIntegrationEnvironment('#oauthTokens');

  before(function() {
    if (this._skipFixtureSetup) return;

    request = require('supertest');
    app = require('../../../server/api');
  });

  const fixture = fixtureLoader.setup({
    user1: {
      accessToken: 'web-internal'
    },
    userAdmin1: {
      accessToken: 'web-internal'
    },
    userToBan1: {
      accessToken: 'web-internal'
    },
    troupe1: {
      securityDescriptor: {
        extraAdmins: ['userAdmin1']
      }
    }
  });

  describe('POST /v1/rooms/:roomId/bans', () => {
    it('Normal user not allowed to ban people', () => {
      return request(app)
        .post(`/v1/rooms/${fixture.troupe1.id}/bans`)
        .send({
          username: fixture.userToBan1.username
        })
        .set('x-access-token', fixture.user1.accessToken)
        .expect(403);
    });

    it('Ban normal user', () => {
      return request(app)
        .post(`/v1/rooms/${fixture.troupe1.id}/bans`)
        .send({
          username: fixture.userToBan1.username
        })
        .set('x-access-token', fixture.userAdmin1.accessToken)
        .expect(200);
    });

    it('ban virtualUser via username', () => {
      return request(app)
        .post(`/v1/rooms/${fixture.troupe1.id}/bans`)
        .send({
          username: 'bad-guy:matrix.org'
        })
        .set('x-access-token', fixture.userAdmin1.accessToken)
        .expect(200)
        .then(function(result) {
          const body = result.body;
          assert(body.virtualUser);
        });
    });

    it('ban virtualUser via object', () => {
      return request(app)
        .post(`/v1/rooms/${fixture.troupe1.id}/bans`)
        .send({
          virtualUser: {
            type: 'matrix',
            externalId: 'bad-guy:matrix.org'
          }
        })
        .set('x-access-token', fixture.userAdmin1.accessToken)
        .expect(200)
        .then(function(result) {
          const body = result.body;
          assert(body.virtualUser);
        });
    });
  });

  describe('DELETE /v1/rooms/:roomId/bans', () => {
    it('Normal user not allowed to unban people', () => {
      return request(app)
        .delete(`/v1/rooms/${fixture.troupe1.id}/bans/${fixture.userToBan1.username}`)
        .set('x-access-token', fixture.user1.accessToken)
        .expect(403);
    });

    it('Unban normal user', () => {
      return request(app)
        .delete(`/v1/rooms/${fixture.troupe1.id}/bans/${fixture.userToBan1.username}`)
        .set('x-access-token', fixture.userAdmin1.accessToken)
        .expect(200);
    });

    it('Unban virtualUser', () => {
      return request(app)
        .delete(`/v1/rooms/${fixture.troupe1.id}/bans/bad-guy:matrix.org`)
        .set('x-access-token', fixture.userAdmin1.accessToken)
        .expect(200);
    });
  });
});
