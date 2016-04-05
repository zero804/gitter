"use strict";

var testRequire   = require('../test-require');
var fixtureLoader = require('../test-fixtures');
var Promise       = require('bluebird');
var _             = require('underscore');
var assert        = require("assert");
var fixture       = {};

function findUserIdPredicate(userId) {
  return function(x) {
    return "" + x === "" + userId;
  };
}
describe('one-to-one-room-service', function() {

  describe('#slow', function() {
    var oneToOneRoomService = testRequire('./services/one-to-one-room-service');
    var roomMembershipService = testRequire('./services/room-membership-service');

    before(fixtureLoader(fixture, {
      user1: {
      },
      user2: {
      },
      user3: {
      }
    }));

    after(function() { fixture.cleanup(); });

    it('should handle the creation of a oneToOneTroupe single', function(done) {
      oneToOneRoomService.findOrCreateOneToOneRoom(fixture.user1.id, fixture.user2.id)
        .spread(function(troupe, otherUser) {
          assert(troupe);
          assert(troupe.oneToOne);
          assert.strictEqual(troupe.githubType, 'ONETOONE');
          assert.strictEqual(otherUser.id, fixture.user2.id);
          assert.strictEqual(troupe.oneToOneUsers.length, 2);

          return roomMembershipService.findMembersForRoom(troupe.id);
        })
        .then(function(userIds) {
          assert(_.find(userIds, findUserIdPredicate(fixture.user1.id)));
          assert(_.find(userIds, findUserIdPredicate(fixture.user2.id)));
        })
        .nodeify(done);
    });

    it('should handle the creation of a oneToOneTroupe atomicly', function(done) {
      Promise.all([
          oneToOneRoomService.findOrCreateOneToOneRoom(fixture.user2.id, fixture.user3.id),
          oneToOneRoomService.findOrCreateOneToOneRoom(fixture.user3.id, fixture.user2.id)
        ])
        .spread(function(r1, r2) {
          var troupe1 = r1[0];
          var otherUser1 = r1[1];
          var troupe2 = r2[0];
          var otherUser2 = r2[1];

          assert(troupe1);
          assert(troupe1.oneToOne);
          assert.strictEqual(troupe1.githubType, 'ONETOONE');
          assert.strictEqual(troupe1.oneToOneUsers.length, 2);
          assert.strictEqual(otherUser1.id, fixture.user3.id);

          assert(troupe2);
          assert(troupe2.oneToOne);
          assert.strictEqual(troupe2.githubType, 'ONETOONE');
          assert.strictEqual(troupe2.oneToOneUsers.length, 2);
          assert.strictEqual(otherUser2.id, fixture.user2.id);

          assert.strictEqual(troupe1.id, troupe2.id);

          return roomMembershipService.findMembersForRoom(troupe1.id);
        })
        .then(function(userIds) {
          assert(_.find(userIds, findUserIdPredicate(fixture.user2.id)));
          assert(_.find(userIds, findUserIdPredicate(fixture.user3.id)));
        })
        .nodeify(done);
    });

  });



});
