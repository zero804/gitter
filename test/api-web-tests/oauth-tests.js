'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var request = require('supertest-as-promised')(Promise);

var app = require('../../server/web');

describe('OAuth tests', function() {
  var fixture = fixtureLoader.setup({
    user1: { },
    oAuthClient1: {
      registeredRedirectUri: 'http://localhost:3434/callback'
    },
    oAuthCode1: {
      user: 'user1',
      client: 'oAuthClient1'
    }
  });

  it('GET /login/oauth/token clears out authorization code so it can\'t be re-used', async function() {
    this.timeout(8000);

    const postData = {
      client_id: fixture.oAuthClient1.clientKey,
      client_secret: fixture.oAuthClient1.clientSecret,
      redirect_uri: fixture.oAuthClient1.registeredRedirectUri,
      grant_type: 'authorization_code',
      code: fixture.oAuthCode1.code
    };

    await request(app)
      .post(`/login/oauth/token`)
      .send(postData)
      .expect(200)
      .then(function(result) {
        assert(result.body.access_token && result.body.access_token.length > 0, 'no access token provided in body');
        assert(result.body.token_type === 'Bearer', 'wrong token_type returned');
      });

    await request(app)
      .post(`/login/oauth/token`)
      .send(postData)
      .expect(403)
      .then(function(result) {
        assert.deepEqual(result.body, {
            "error": "invalid_grant",
            "error_description": "Invalid authorization code"
        });
      });
  });
});
