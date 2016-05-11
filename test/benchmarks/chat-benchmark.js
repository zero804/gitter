'use strict';

var makeBenchmark = require('../make-benchmark');
var fixtureLoader = require('../integration/test-fixtures');
var chatService = require('../../server/services/chat-service');
var roomMembershipFlags = require("../../server/services/room-membership-flags");

var fixture = {};

makeBenchmark({
  maxTime: 30,
  before: function(done) {
    var fixtureDescription = {
      troupeSmall: { users: ['user1', 'user2', 'user3'] },
      troupeBig: {
        users: [],
        membershipStrategy: function(userId, index) {
          switch (index % 3) {
            case 0:
              return {
                mode: roomMembershipFlags.MODES.all,
                lurk: false
              };

            case 1:
              return {
                mode: roomMembershipFlags.MODES.announcement,
                lurk: true
              };

            case 2:
              return {
                mode: roomMembershipFlags.MODES.mute,
                lurk: true
              };
          }
        }
      },
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
