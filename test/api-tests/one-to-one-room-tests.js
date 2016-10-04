'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

describe('one-to-one-rooms', function() {
  var app, request;

  before(function() {
    request = require("supertest-as-promised")(Promise);
    app = require('../../server/api');
  });

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
  });

  it('One-to-one between two users with default notification settings', function() {
    return request(app)
      .post('/v1/rooms')
      .send({
        uri: fixture.user2.username
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(res) {
        var roomId = res.body.id;
        assert(roomId);

        return request(app)
          .get('/v1/user/me/rooms/' + roomId + '/settings/notifications')
          .set('x-access-token', fixture.user1.accessToken)
          .expect(200)
      })
      .then(function(res) {
        var body = res.body;
        assert.strictEqual(body.mode, 'all');
      })
  });

  it('One-to-one between two users with where one user has default notification settings of mute', function() {
    return request(app)
      .put('/v1/user/me/settings/defaultRoomMode')
      .send({
        mode: 'mute'
      })
      .set('x-access-token', fixture.user3.accessToken)
      .expect(200)
      .then(function(res) {
        assert(res.body.mode, 'mute');

        return request(app)
          .post('/v1/rooms')
          .send({
            uri: fixture.user2.username
          })
          .set('x-access-token', fixture.user3.accessToken)
          .expect(200);
      })
      .bind({
        roomId: null
      })
      .then(function(res) {
        var roomId = this.roomId = res.body.id;
        assert(roomId);

        return request(app)
          .get('/v1/user/me/rooms/' + roomId + '/settings/notifications')
          .set('x-access-token', fixture.user3.accessToken)
          .expect(200);
      })
      .then(function(res) {
        var body = res.body;
        assert.strictEqual(body.mode, 'announcement');

        return request(app)
          .get('/v1/user/me/rooms/' + this.roomId + '/settings/notifications')
          .set('x-access-token', fixture.user2.accessToken)
          .expect(200);
      })
      .then(function(res) {
        var body = res.body;
        assert.strictEqual(body.mode, 'all');
      });
  });

})
