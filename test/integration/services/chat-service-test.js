/*jslint node: true, unused:true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

var testRequire = require('../test-require');

var chatService = testRequire('./services/chat-service');
var persistence = testRequire('./services/persistence-service');

var assert = require('assert');

describe('chatService', function() {
  describe('updateChatMessage', function() {

    it('should update a recent chat message sent by the same user', function(done) {
      persistence.Troupe.findOne({ uri: 'testtroupe1' }, function(err, troupe) {
        if(err) return done(err);
        if(!troupe) return done("Test troupe not found");

        persistence.User.findOne({ email: 'testuser@troupetest.local' }, function(err, user) {
          if(err) return done(err);
          if(!user) return done("Test user not found");

          chatService.newChatMessageToTroupe(troupe, user, 'Hello', function(err, chatMessage) {
            if(err) return done(err);

            var originalSentTime = chatMessage.sent;
            assert(!chatMessage.editedAt, 'Expected editedAt to be null');

            chatService.updateChatMessage(troupe, chatMessage, user, 'Goodbye', function(err, chatMessage2) {
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

    });

  });

});

