/*jslint node: true, unused:true */
/*global describe:true, it: true, before:true */
"use strict";

var testRequire = require('../test-require');

var chatService = testRequire('./services/chat-service');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var Promise = require('bluebird');

describe('chatService', function() {

  var blockTimer = require('../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = {};
  before(fixtureLoader(fixture, {
    user1: {},
    troupe1: {users: ['user1']},
    message1: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'old_message',
      sent: new Date("01/01/2014")
    },
    message2: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'new_message',
      sent: new Date()
    }
  }));

  describe('updateChatMessage', function() {
    it('should update a recent chat message sent by the same user', function() {

      return chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, { text: 'Hello' })
        .bind({})
        .then(function(chatMessage) {
          this.originalSentTime = chatMessage.sent;
          assert(!chatMessage.editedAt, 'Expected editedAt to be null');

          return chatService.updateChatMessage(fixture.troupe1, chatMessage, fixture.user1, 'Goodbye');
        })
        .then(function(chatMessage2) {
          assert(chatMessage2.text === 'Goodbye', 'Expected new text in message');
          assert(this.originalSentTime === chatMessage2.sent, 'Expected time to remain the same');
          assert(chatMessage2.editedAt, 'Expected edited at time to be populated');
          assert(chatMessage2.editedAt > chatMessage2.sent, 'Expected edited at time to be after sent time');
        });
    });
  });

  describe('updateStatusMessage', function() {
    it('should update a recent `/me` status message sent by the same user ', function () {
      return chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, { text: '@walter is happy', status: true })
        .then(function(chatMessage) {
          assert(chatMessage.text === '@walter is happy', 'Expected text to be the same');
          assert(chatMessage.status, 'Expected status to be set to true');
        });
    });
  });

  describe('Message entities', function() {
    it('should collect metadata from the message text', function() {

      return chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, { text: 'hey @mauro check https://trou.pe' })
        .then(function(chatMessage) {
          assert(Array.isArray(chatMessage.urls), 'urls should be an array');
          assert(chatMessage.urls[0].url === 'https://trou.pe', 'url should be a valid TwitterText url entity');

          assert(Array.isArray(chatMessage.mentions), 'mentions should be an array');
          assert(chatMessage.mentions[0].screenName === 'mauro', 'mention should be a valid TwitterText mention entity');

          assert(chatMessage.metadataVersion !== 'undefined', 'there should be a metadataVersion');
        });

    });
  });

  describe('Finding messages #slow', function() {
    var chat1, chat2, chat3;

    before(function() {
      return chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, { text: 'A' })
        .then(function(chat) {
          chat1 = chat.id;
          return chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, { text: 'B' });
        })
        .then(function(chat) {
          chat2 = chat.id;
          return chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, { text: 'C' }) ;
        })
        .then(function(chat) {
          chat3 = chat.id;
        });
    });

    it('should find messages using aroundId', function() {
      return chatService.findChatMessagesForTroupe(fixture.troupe1.id, { aroundId: chat2 })
        .then(function(chats) {
          assert(chats.length >= 3);
          assert.strictEqual(chats.filter(function(f) { return f.id == chat1; }).length, 1);
          assert.strictEqual(chats.filter(function(f) { return f.id == chat2; }).length, 1);
          assert.strictEqual(chats.filter(function(f) { return f.id == chat3; }).length, 1);
        });
    });

    it('should find messages with skip', function() {
      return Promise.join(
        chatService.findChatMessagesForTroupe(fixture.troupe1.id, { skip: 1, readPreference: 'primaryPreferred' }),
        chatService.findChatMessagesForTroupe(fixture.troupe1.id, { }),
        function(withSkip, withoutSkip) {
          assert(withSkip.length > 2);
          assert(withoutSkip.length > 2);

          var lastItemWithoutSkip = withoutSkip[withoutSkip.length - 1];
          var secondLastItemWithoutSkip = withoutSkip[withoutSkip.length - 2];

          var lastItemWithSkip = withSkip[withSkip.length - 1];
          // Last item without skip does not exist in with skip...
          assert.deepEqual(withSkip.filter(function(f) { return f.id == lastItemWithoutSkip.id; }), []);

          assert.strictEqual(secondLastItemWithoutSkip.id, lastItemWithSkip.id);
        });
    });

    it('should not allow skip greater than 5000', function() {
      return chatService.findChatMessagesForTroupe(fixture.troupe1.id, { skip: 10000 })
        .then(function() {
          assert.ok(false);
        }, function(err) {
          assert.strictEqual(err.message, 'Skip is limited to 5000 items. Please use beforeId rather than skip. See https://developer.gitter.im');
        });
    });

    it('should find messages using beforeId', function() {
      return chatService.findChatMessagesForTroupe(fixture.troupe1.id, { beforeId: chat2 })
        .then(function(chats) {
          assert(chats.length >= 1);
          assert.strictEqual(chats.filter(function(f) { return f.id == chat1; }).length, 1);
          assert.strictEqual(chats.filter(function(f) { return f.id == chat2; }).length, 0);
          assert.strictEqual(chats.filter(function(f) { return f.id == chat3; }).length, 0);
        });
    });

    it('should find messages using beforeInclId', function() {
      return chatService.findChatMessagesForTroupe(fixture.troupe1.id, { beforeInclId: chat2 })
        .then(function(chats) {
          assert(chats.length >= 2);
          assert.strictEqual(chats.filter(function(f) { return f.id == chat1; }).length, 1);
          assert.strictEqual(chats.filter(function(f) { return f.id == chat2; }).length, 1);
          assert.strictEqual(chats.filter(function(f) { return f.id == chat3; }).length, 0);
        });
    });

    it('should find messages using afterId', function() {
      return chatService.findChatMessagesForTroupe(fixture.troupe1.id, { afterId: chat2 })
        .then(function(chats) {
          assert(chats.length >= 1);
          assert.strictEqual(chats.filter(function(f) { return f.id == chat1; }).length, 0);
          assert.strictEqual(chats.filter(function(f) { return f.id == chat2; }).length, 0);
          assert.strictEqual(chats.filter(function(f) { return f.id == chat3; }).length, 1);
        });
    });

  });

});
