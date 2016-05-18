'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var fixtureLoader = require('../integration/test-fixtures');

describe('group-api', function() {
  var app, request;

  before(function() {
    request = require("supertest-as-promised")(Promise);
    app = require('../../server/api');
  });

  var fixture = {};
  before(fixtureLoader(fixture, {
    user1: {
      accessToken: 'web-internal'
    },
    group1: {},
    troupe1: {}
  }));

  after(function() {
    return fixture.cleanup();
  });

  it('GET /', function() {
    return request(app)
      .get('/v1/groups')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
  });

  it('POST /', function() {
    return request(app)
      .post('/v1/groups')
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
  });

})
