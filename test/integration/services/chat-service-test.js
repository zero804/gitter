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

  before(fixtureLoader(fixture));

});

