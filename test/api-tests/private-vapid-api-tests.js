'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('vapid-api', function() {
  var app, request;

  before(function() {
    request = require("supertest-as-promised")(Promise);
    app = require('../../server/api');
  });

  var fixture = fixtureLoader.setup({
    user1: {
      accessToken: 'web-internal'
    }
  });

  fixtureLoader.disableMongoTableScans();

  it('GET /private/vapid', function() {
    return request(app)
      .post('/private/vapid')
      .send({
        endpoint: 'https://localhost/moo/cow',
        keys: {
          auth: '1',
          p256dh: 'hell, man, diffie'
        }
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(204)
  });

})
