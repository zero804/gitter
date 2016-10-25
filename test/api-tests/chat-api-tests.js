'use strict';

process.env.DISABLE_API_LISTEN = '1';

var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

describe('chat-api', function() {
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
    troupe1: {
      security: 'PUBLIC',
      users: ['user1'],
      securityDescriptor: {
        extraAdmins: ['user3'],
      }
    },
    troupe2: {
      security: 'PUBLIC',
      users: ['user1', 'user2', 'user3'],
    },
    message1: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'HELLO1',
      sent: new Date(),
      pub: 1
    },
    message2: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'HELLO2',
      sent: new Date(),
      pub: 1
    },
    message3: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'HELLO2',
      sent: new Date(),
      pub: 1
    },
  });

  it('POST /v1/rooms/:roomId/chatMessages', function() {
    return request(app)
      .post('/v1/rooms/' + fixture.troupe1.id + '/chatMessages')
      .send({
        text: 'Hello there'
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var body = result.body;
        assert.strictEqual(body.text, 'Hello there');
      })
  });

  it('DELETE /v1/rooms/:roomId/chatMessages/:chatMessageId - own message', function() {
    return request(app)
      .del('/v1/rooms/' + fixture.troupe1.id + '/chatMessages/' + fixture.message3.id)
      .set('x-access-token', fixture.user1.accessToken)
      .expect(204);
  });

  it('DELETE /v1/rooms/:roomId/chatMessages/:chatMessageId - some elses message', function() {
    return request(app)
      .del('/v1/rooms/' + fixture.troupe1.id + '/chatMessages/' + fixture.message2.id)
      .set('x-access-token', fixture.user2.accessToken)
      .expect(403);
  });

  it('DELETE /v1/rooms/:roomId/chatMessages/:chatMessageId - as admin', function() {
    return request(app)
      .del('/v1/rooms/' + fixture.troupe1.id + '/chatMessages/' + fixture.message2.id)
      .set('x-access-token', fixture.user3.accessToken)
      .expect(204);
  });

  it('POST/DELETE/unread-items non mentions', function() {
    var chatId;

    return request(app)
      .post('/v1/rooms/' + fixture.troupe2.id + '/chatMessages')
      .send({
        text: 'Hello there'
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var body = result.body;
        chatId = body.id;
      })
      .delay(1000)
      .then(function() {
        return request(app)
          .get('/v1/user/me/rooms/' + fixture.troupe2.id + '/unreadItems')
          .set('x-access-token', fixture.user2.accessToken)
          .expect(200);
      })
      .then(function(res) {
        var unreadItems = res.body;
        assert.deepEqual(unreadItems, {
          chat: [chatId],
          mention: []
        });

        return request(app)
          .del('/v1/rooms/' + fixture.troupe2.id + '/chatMessages/' + chatId)
          .set('x-access-token', fixture.user1.accessToken)
          .expect(204);
      })
      .then(function() {
        return request(app)
          .get('/v1/user/me/rooms/' + fixture.troupe2.id + '/unreadItems')
          .set('x-access-token', fixture.user2.accessToken)
          .expect(200);
      })
      .then(function(res) {
        var unreadItems = res.body;

        assert.deepEqual(unreadItems, {
          chat: [],
          mention: []
        })
      })
  });

  it('POST/DELETE/unread-items mentions', function() {
    var chatId;

    return request(app)
      .post('/v1/rooms/' + fixture.troupe2.id + '/chatMessages')
      .send({
        text: 'Hello there @' + fixture.user2.username
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var body = result.body;
        chatId = body.id;
      })
      .delay(1000)
      .then(function() {
        return request(app)
          .get('/v1/user/me/rooms/' + fixture.troupe2.id + '/unreadItems')
          .set('x-access-token', fixture.user2.accessToken)
          .expect(200);
      })
      .then(function(res) {
        var unreadItems = res.body;
        assert.deepEqual(unreadItems, {
          chat: [chatId],
          mention: [chatId]
        });

        return request(app)
          .del('/v1/rooms/' + fixture.troupe2.id + '/chatMessages/' + chatId)
          .set('x-access-token', fixture.user1.accessToken)
          .expect(204);
      })
      .then(function() {
        return request(app)
          .get('/v1/user/me/rooms/' + fixture.troupe2.id + '/unreadItems')
          .set('x-access-token', fixture.user2.accessToken)
          .expect(200);
      })
      .then(function(res) {
        var unreadItems = res.body;

        assert.deepEqual(unreadItems, {
          chat: [],
          mention: []
        })
      })
  });


})
