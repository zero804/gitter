'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var unreadItemsEngine = require('../../server/services/unread-items/engine');

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
        return res;
      })
      .bind({
        roomId: null,
        chatId: null
      })
      .then(function(res) {
        var roomId = this.roomId = res.body.id;
        assert(roomId);

        return request(app)
          .get('/v1/user/me/rooms/' + roomId + '/settings/notifications')
          .set('x-access-token', fixture.user1.accessToken)
          .expect(200)
      })
      .then(function(res) {
        var body = res.body;
        assert.strictEqual(body.mode, 'all');

        return request(app)
          .post('/v1/rooms/' + this.roomId + '/chatMessages')
          .send({
            text: 'Hello in a one-to-one'
          })
          .set('x-access-token', fixture.user1.accessToken)
          .expect(200);
      })
      .delay(1000) // Unread item distribution is async
      .then(function(res) {
        this.chatId = res.body.id;
        var since = Date.now();
        return unreadItemsEngine.listTroupeUsersForEmailNotifications(since, 60);
      })
      .then(function(result) {
        // User2 has email notifications
        assert(result[fixture.user2.id]);

        // User2 will be notified of the new chat in the one-to-one
        assert.deepEqual(result[fixture.user2.id][this.roomId], [this.chatId]);
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
