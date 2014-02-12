/*jslint node: true, unused:true */
/*global describe:true, it: true, before:true */
"use strict";

var testRequire = require('../test-require');

var chatService = testRequire('./services/chat-service');
var fixtureLoader = require('../test-fixtures');

var assert = require('assert');

var fixture = {};


describe('chatService', function() {

  describe('updateChatMessage', function() {

    it('should update a recent chat message sent by the same user', function(done) {

      chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, 'Hello', function(err, chatMessage) {
        if(err) return done(err);

        var originalSentTime = chatMessage.sent;
        assert(!chatMessage.editedAt, 'Expected editedAt to be null');

        chatService.updateChatMessage(fixture.troupe1, chatMessage, fixture.user1, 'Goodbye', function(err, chatMessage2) {
          if(err) return done(err);

          assert(chatMessage2.text === 'Goodbye', 'Expected new text in message');
          assert(originalSentTime === chatMessage2.sent, 'Expected time to remain the same');
          assert(chatMessage2.editedAt, 'Expected edited at time to be populated');
          assert(chatMessage2.editedAt > chatMessage2.sent, 'Expected edited at time to be after sent time');

          done();
        });
      });


    });

  });

  describe('Message entities', function() {
    it('should collect metadata from the message text', function(done) {

      chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, 'hey @mauro check https://trou.pe', function(err, chatMessage) {
        if(err) return done(err);

        assert(Array.isArray(chatMessage.urls), 'urls should be an array');
        assert(chatMessage.urls[0].url === 'https://trou.pe', 'url should be a valid TwitterText url entity');

        assert(Array.isArray(chatMessage.mentions), 'mentions should be an array');
        assert(chatMessage.mentions[0].screenName === 'mauro', 'mention should be a valid TwitterText mention entity');

        assert(chatMessage.metadataVersion !== 'undefined', 'there should be a metadataVersion');

        done();
      });

    });
  });


  before(fixtureLoader(fixture));

});

