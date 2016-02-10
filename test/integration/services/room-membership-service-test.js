"use strict";

var testRequire   = require('../test-require');
var fixtureLoader = require('../test-fixtures');
var assert        = require("assert");
var Promise       = require('bluebird');
var fixture       = {};

function mongoIdEqualPredicate(value) {
  var strValue = String(value);
  return function(x) { return String(x) === strValue; };
}

describe('room-membership-service', function() {

  describe('#slow', function() {
    var roomMembershipService, persistence;

    before(function() {
       roomMembershipService = testRequire('./services/room-membership-service');
       persistence = testRequire('./services/persistence-service');
    });

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
      troupe3: {
      }
    }));

    after(function() { fixture.cleanup(); });

    it('should add a single user to a room', function() {
      var troupeId3 = fixture.troupe3._id;
      var userId1 = fixture.user1._id;

      return roomMembershipService.addRoomMember(troupeId3, userId1)
        .then(function() {
          return roomMembershipService.countMembersInRoom(troupeId3);
        })
        .then(function(count) {
          assert.strictEqual(count, 1);
          return roomMembershipService.findMembersForRoom(troupeId3);
        })
        .then(function(members) {
          assert.deepEqual(members, [userId1]);

          return roomMembershipService.findRoomIdsForUser(userId1);
        })
        .then(function(roomIds) {
          assert(roomIds.length >= 1);
          assert(roomIds.some(mongoIdEqualPredicate(troupeId3)));
        });
    });

    it('should allow users to be added to a room', function() {
      return roomMembershipService.addRoomMembers(fixture.troupe1.id, [fixture.user1.id])
        .then(function(userIds) {
          assert.strictEqual(userIds.length, 1);
          assert.strictEqual(userIds[0], fixture.user1.id);
          return roomMembershipService.countMembersInRoom(fixture.troupe1.id);
        })
        .then(function(count) {
          assert.strictEqual(count, 1);
          return roomMembershipService.checkRoomMembership(fixture.troupe1.id, fixture.user1.id);
        })
        .then(function(member) {
          assert(member);
          return persistence.Troupe.findById(fixture.troupe1.id).exec();
        })
        .then(function(troupe) {
          assert.strictEqual(troupe.userCount, 1);
          return roomMembershipService.checkRoomMembership(fixture.troupe1.id, fixture.user2.id);
        })
        .then(function(member) {
          assert(!member);
        });
    });

    it('should allow users to be removed from a room', function() {
      return roomMembershipService.addRoomMembers(fixture.troupe2.id, [fixture.user1.id, fixture.user2.id])
        .then(function() {
          return persistence.Troupe.findById(fixture.troupe2.id).exec();
        })
        .then(function(troupe) {
          assert.strictEqual(troupe.userCount, 2);
          return roomMembershipService.removeRoomMembers(fixture.troupe2.id, [fixture.user1.id]);
        })
        .then(function() {
          return roomMembershipService.countMembersInRoom(fixture.troupe2.id);
        })
        .then(function(count) {
          assert.strictEqual(count, 1);
          return persistence.Troupe.findById(fixture.troupe2.id).exec();
        })
        .then(function(troupe) {
          assert.strictEqual(troupe.userCount, 1);

          return roomMembershipService.checkRoomMembership(fixture.troupe2.id, fixture.user2.id);
        })
        .then(function(member) {
          assert(member);
          return roomMembershipService.checkRoomMembership(fixture.troupe2.id, fixture.user1.id);
        })
        .then(function(member) {
          assert(!member);
        });
    });

    describe('membership modes', function() {
      it('should handle lurk status alongside membership mode mute', function() {
        return roomMembershipService.addRoomMembers(fixture.troupe2.id, [fixture.user1.id])
          .then(function() {
            return roomMembershipService.setMembershipMode(fixture.user1.id, fixture.troupe2.id, 'mute');
          })
          .then(function() {
            return roomMembershipService.getMembershipMode(fixture.user1.id, fixture.troupe2.id);
          })
          .then(function(mode) {
            assert.strictEqual(mode, 'mute');
            return roomMembershipService.getMemberLurkStatus(fixture.troupe2.id, fixture.user1.id);
          })
          .then(function(lurking) {
            assert.strictEqual(lurking, true);
          });
      });

      it('should handle lurk status alongside membership mode announcements', function() {
        return roomMembershipService.addRoomMembers(fixture.troupe2.id, [fixture.user1.id])
          .then(function() {
            return roomMembershipService.setMembershipMode(fixture.user1.id, fixture.troupe2.id, 'announcements');
          })
          .then(function() {
            return roomMembershipService.getMembershipMode(fixture.user1.id, fixture.troupe2.id);
          })
          .then(function(mode) {
            assert.strictEqual(mode, 'announcements');
            return roomMembershipService.getMemberLurkStatus(fixture.troupe2.id, fixture.user1.id);
          })
          .then(function(lurking) {
            assert.strictEqual(lurking, true);
          });
      });

      it('should handle lurk status alongside membership mode all', function() {
        return roomMembershipService.addRoomMembers(fixture.troupe2.id, [fixture.user1.id])
          .then(function() {
            return roomMembershipService.setMembershipMode(fixture.user1.id, fixture.troupe2.id, 'all');
          })
          .then(function() {
            return roomMembershipService.getMembershipMode(fixture.user1.id, fixture.troupe2.id);
          })
          .then(function(mode) {
            assert.strictEqual(mode, 'all');
            return roomMembershipService.getMemberLurkStatus(fixture.troupe2.id, fixture.user1.id);
          })
          .then(function(lurking) {
            assert.strictEqual(lurking, false);
          });
      });
    });

    it('findMembersForRoom should handle skip and limit', function() {
      var troupeId2 = fixture.troupe2.id;
      var userId1 = fixture.user1.id;
      var userId2 = fixture.user2.id;

      return roomMembershipService.addRoomMembers(troupeId2, [userId1, userId2])
        .then(function() {
          return Promise.join(
            roomMembershipService.findMembersForRoom(troupeId2, { limit: 1 }),
            roomMembershipService.findMembersForRoom(troupeId2, { skip: 1, limit: 1 }),
            function(find1, find2) {
              assert.strictEqual(find1.length, 1);
              assert.strictEqual(find2.length, 1);

              assert(find1.some(mongoIdEqualPredicate(userId1)) || find2.some(mongoIdEqualPredicate(userId1)));
              assert(find1.some(mongoIdEqualPredicate(userId2)) || find2.some(mongoIdEqualPredicate(userId2)));
            });
        })

    })

  });


});
