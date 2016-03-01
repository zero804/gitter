/* jshint node:true, unused:true */
'use strict';

var makeBenchmark = require('../make-benchmark');
var fixtureLoader = require('../integration/test-fixtures');
var chatService = require('../../server/services/chat-service');

var fixture = {};

makeBenchmark({
  maxTime: 30,
  before: function(done) {
    var fixtureDescription = {
      troupeSmall: { users: ['user1', 'user2', 'user3'] },
      troupeBig: { users: [] },
    };

    for(var i = 0; i < 10000; i++) {
      fixtureDescription['user' + i] = {};
      fixtureDescription.troupeBig.users.push('user' + i);
    }
    // userOnlyOne is in one room
    // user0...5000 are in two or three rooms
    fixtureLoader(fixture, fixtureDescription)(done);
  },

  after: function(done) {
    fixture.cleanup(done);
  },

  tests: {
    'newChatMessageToTroupe#troupeSmall': function(done) {
      chatService.newChatMessageToTroupe(fixture.troupeSmall, fixture.user1, { text: 'This is a message'})
        .nodeify(done);
    },

    'newChatMessageToTroupe#troupeBig': function(done) {
      chatService.newChatMessageToTroupe(fixture.troupeBig, fixture.user1, { text: 'This is a message'})
        .nodeify(done);
    },


  }

});
