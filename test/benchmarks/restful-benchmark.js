/* jshint node:true, unused:true */
'use strict';

var makeBenchmark = require('../make-benchmark');
var fixtureLoader = require('../integration/test-fixtures');
var restful = require('../../server/services/restful');

var fixture = {};

makeBenchmark({
  before: function(done) {
    var fixtureDescription = {
      troupe1: { users: [] },
      troupe2: { users: [] },
      troupe3: { users: ['user1'] },
      troupe4: { users: ['userOnlyOne'] }
    };

    for(var i = 0; i < 5000; i++) {
      fixtureDescription['user' + i] = {};
      fixtureDescription.troupe1.users.push('user' + i);
      if (i % 2 === 0) {
        fixtureDescription.troupe2.users.push('user' + i);
      }
    }

    for (var j = 0; j < 100; j++) {
      fixtureDescription['message' + j] = {
        troupe: 'troupe1',
        user: 'user' + (j % 10)
      };
    }
    // userOnlyOne is in one room
    // user0...5000 are in two or three rooms
    fixtureLoader(fixture, fixtureDescription)(done);
  },

  after: function(done) {
    fixture.cleanup(done);
  },

  tests: {
    'serializeChatsForTroupe': function(done) {
      restful.serializeChatsForTroupe(fixture.troupe1.id, fixture.user0.id, {})
        .nodeify(done);
    },

    'serializeTroupesForUser#oneRoom': function(done) {
      restful.serializeTroupesForUser(fixture.userOnlyOne.id)
        .nodeify(done);
    },

    'serializeTroupesForUser#withLargeRooms': function(done) {
      restful.serializeTroupesForUser(fixture.user0.id)
        .nodeify(done);
    },

    'serializeUsersForTroupe#smallRoom': function(done) {
      restful.serializeUsersForTroupe(fixture.troupe4.id, fixture.userOnlyOne.id, {})
        .nodeify(done);
    },

    'serializeUsersForTroupe#largeRoom': function(done) {
      restful.serializeUsersForTroupe(fixture.troupe1.id, fixture.user0.id, {})
        .nodeify(done);
    },

    'serializeUsersForTroupe#largeRoomLimit': function(done) {
      restful.serializeUsersForTroupe(fixture.troupe1.id, fixture.user0.id, { limit: 25 })
        .nodeify(done);
    },

  }

});
