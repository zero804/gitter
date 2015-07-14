"use strict";


var testRequire   = require('../test-require');
var fixtureLoader = require('../test-fixtures');
var Q             = require("q");
var _             = require('underscore');
var assert        = require("assert");
var mockito       = require('jsmockito').JsMockito;
var mongoUtils    = testRequire("./utils/mongo-utils");
var times         = mockito.Verifiers.times;
var once          = times(1);
var times         = mockito.Verifiers.times;
var fixture       = {};

Q.longStackSupport = true;

function findUserIdPredicate(userId) {
  return function(x) {
    return "" + x === "" + userId;
  }
}

describe('room-membership-service', function() {

  describe('#slow', function() {
    var roomMembershipService;

    before(function() {
       roomMembershipService = testRequire('./services/room-membership-service');
    })

    before(fixtureLoader(fixture, {
      user1: {
      },
      user2: {
      },
      user3: {
      },
      troupe1: {
      },
      troupe2: {
      },
    }));

    after(function() { fixture.cleanup(); });

    it('should allow users to be added to a room', function(done) {
      roomMembershipService.addRoomMembers(fixture.troupe1.id, [fixture.user1.id])
        .then(function(userIds) {
          assert.strictEqual(userIds.length, 1);
          assert.strictEqual(userIds[0], fixture.user1.id);
          return roomMembershipService.countMembersInRoom(fixture.troupe1.id);
        })
        .then(function(count) {
          assert.strictEqual(count, 1);
          return roomMembershipService.checkRoomMembership(fixture.troupe1.id, fixture.user1.id)
        })
        .then(function(member) {
          assert(member);
          return roomMembershipService.checkRoomMembership(fixture.troupe1.id, fixture.user2.id)
        })
        .then(function(member) {
          assert(!member);
        })

        .nodeify(done);
    });

    it('should allow users to be removed from a room', function(done) {
      roomMembershipService.addRoomMembers(fixture.troupe2.id, [fixture.user1.id, fixture.user2.id])
        .then(function() {
          return roomMembershipService.removeRoomMembers(fixture.troupe2.id, [fixture.user1.id]);
        })
        .then(function() {
          return roomMembershipService.countMembersInRoom(fixture.troupe2.id);
        })
        .then(function(count) {
          assert.strictEqual(count, 1);
          return roomMembershipService.checkRoomMembership(fixture.troupe2.id, fixture.user2.id)
        })
        .then(function(member) {
          assert(member);
          return roomMembershipService.checkRoomMembership(fixture.troupe2.id, fixture.user1.id)
        })
        .then(function(member) {
          assert(!member);
        })

        .nodeify(done);
    });

  });


});
