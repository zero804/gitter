'use strict';

var fixtureLoader = require('../integration/test-fixtures');
var restful = require('../../server/services/restful');

suite('restful', function() {
  set('mintime', 100);
  set('iterations', 50);

  var fixture = {};

  before(function(done) {
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
    // userOnlyOne is in one room
    // user0...5000 are in two or three rooms
    fixtureLoader(fixture, fixtureDescription)(done);
  });

  /** serializeTroupesForUser */

  bench('serializeTroupesForUser#oneRoom', function(done) {
    restful.serializeTroupesForUser(fixture.userOnlyOne.id)
      .nodeify(done);
  });

  bench('serializeTroupesForUser#withLargeRooms', function(done) {
    restful.serializeTroupesForUser(fixture.user0.id)
      .nodeify(done);
  });

  /** serializeUsersForTroupe */

  bench('serializeUsersForTroupe#smallRoom', function(done) {
    restful.serializeUsersForTroupe(fixture.troupe4.id, fixture.userOnlyOne.id, {})
      .nodeify(done);
  });

  bench('serializeUsersForTroupe#largeRoom', function(done) {
    restful.serializeUsersForTroupe(fixture.troupe1.id, fixture.user0.id, {})
      .nodeify(done);
  });

  bench('serializeUsersForTroupe#largeRoomLimit', function(done) {
    restful.serializeUsersForTroupe(fixture.troupe1.id, fixture.user0.id, { limit: 25 })
      .nodeify(done);
  });

  after(function(done) {
    fixture.cleanup(done);
  });
});
