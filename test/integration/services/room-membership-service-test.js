"use strict";

var testRequire   = require('../test-require');
var fixtureLoader = require('../test-fixtures');
var assert        = require("assert");
var Promise       = require('bluebird');
var sinon         = require('sinon');
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

          return persistence.TroupeUser.findOne({ troupeId: troupeId3, userId: userId1 }).exec();
        })
        .then(function(troupeUser) {
          assert.strictEqual(troupeUser.lurk, false);
          assert.strictEqual(Number(troupeUser.flags).toString(2), "1111101");
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
          return persistence.TroupeUser.findOne({ troupeId: fixture.troupe1.id, userId: fixture.user1.id }).exec();
        })
        .then(function(troupeUser) {
          assert.strictEqual(troupeUser.lurk, false);
          assert.strictEqual(Number(troupeUser.flags).toString(2), "1111101");

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

      beforeEach(function() {
        this.onMembersLurkChange = sinon.spy();

        roomMembershipService.events.on('members.lurk.change', this.onMembersLurkChange);
      });

      afterEach(function() {
        roomMembershipService.events.removeListener('members.lurk.change', this.onMembersLurkChange);
      });

      it('should handle lurk status alongside membership mode mute', function() {
        var troupeId2 = fixture.troupe2.id;
        var userId1 = fixture.user1.id;

        return roomMembershipService.removeRoomMember(troupeId2, userId1)
          .bind(this)
          .then(function() {
            return roomMembershipService.addRoomMembers(troupeId2, [userId1]);
          })
          .then(function() {
            return roomMembershipService.setMembershipMode(userId1, troupeId2, 'mute');
          })
          .then(function() {
            // Check that the event emitter fired
            assert.strictEqual(1, this.onMembersLurkChange.callCount);
            var spyCall = this.onMembersLurkChange.getCall(0);

            assert.strictEqual(troupeId2, spyCall.args[0]);
            assert.deepEqual([userId1], spyCall.args[1]);
            assert.strictEqual(true, spyCall.args[2]);

            return roomMembershipService.getMembershipMode(userId1, troupeId2);
          })
          .then(function(mode) {
            assert.strictEqual(mode, 'mute');
            return roomMembershipService.getMemberLurkStatus(troupeId2, userId1);
          })
          .then(function(lurking) {
            assert.strictEqual(lurking, true);
          });
      });

      it('should handle lurk status alongside membership mode announcement', function() {
        var troupeId2 = fixture.troupe2.id;
        var userId1 = fixture.user1.id;

        return roomMembershipService.removeRoomMember(troupeId2, userId1)
          .bind(this)
          .then(function() {
            return roomMembershipService.addRoomMembers(troupeId2, [userId1]);
          })
          .then(function() {
            return roomMembershipService.setMembershipMode(userId1, troupeId2, 'mute');
          })
          .then(function() {
            // Check that the event emitter fired
            assert.strictEqual(1, this.onMembersLurkChange.callCount);
            var spyCall = this.onMembersLurkChange.getCall(0);

            assert.strictEqual(troupeId2, spyCall.args[0]);
            assert.deepEqual([userId1], spyCall.args[1]);
            assert.strictEqual(true, spyCall.args[2]);

            return roomMembershipService.getMembershipMode(userId1, troupeId2);
          })
          .then(function(mode) {
            assert.strictEqual(mode, 'mute');
            return roomMembershipService.getMemberLurkStatus(troupeId2, userId1);
          })
          .then(function(lurking) {
            assert.strictEqual(lurking, true);
          });
      });

      it('should handle lurk status alongside membership mode all', function() {
        var troupeId2 = fixture.troupe2.id;
        var userId1 = fixture.user1.id;

        return roomMembershipService.removeRoomMember(troupeId2, userId1)
          .bind(this)
          .then(function() {
            return roomMembershipService.addRoomMembers(troupeId2, [userId1])
          })
          .then(function() {
            return roomMembershipService.setMembershipMode(userId1, troupeId2, 'all');
          })
          .then(function() {
            assert.strictEqual(0, this.onMembersLurkChange.callCount);

            return roomMembershipService.getMembershipMode(userId1, troupeId2);
          })
          .then(function(mode) {
            assert.strictEqual(mode, 'all');
            return roomMembershipService.getMemberLurkStatus(troupeId2, userId1);
          })
          .then(function(lurking) {
            assert.strictEqual(lurking, false);
          });
      });

      it('should handle transitions to and from lurk mode', function() {
        var troupeId2 = fixture.troupe2.id;
        var userId1 = fixture.user1.id;

        return roomMembershipService.removeRoomMember(troupeId2, userId1)
          .bind(this)
          .then(function() {
            return roomMembershipService.addRoomMembers(troupeId2, [userId1]);
          })
          .then(function() {
            return roomMembershipService.setMembershipMode(userId1, troupeId2, 'all');
          })
          .then(function() {
            assert.strictEqual(0, this.onMembersLurkChange.callCount);

            return roomMembershipService.getMembershipMode(userId1, troupeId2);
          })
          .then(function(mode) {
            assert.strictEqual(mode, 'all');
            return roomMembershipService.getMemberLurkStatus(troupeId2, userId1);
          })
          .then(function(lurking) {
            assert.strictEqual(lurking, false);
            return roomMembershipService.setMembershipMode(userId1, troupeId2, 'mute');
          })
          .then(function() {
            // Check that the event emitter fired
            assert.strictEqual(1, this.onMembersLurkChange.callCount);
            var spyCall = this.onMembersLurkChange.getCall(0);

            assert.strictEqual(troupeId2, spyCall.args[0]);
            assert.deepEqual([userId1], spyCall.args[1]);
            assert.strictEqual(true, spyCall.args[2]);

            return roomMembershipService.getMembershipMode(userId1, troupeId2);
          })
          .then(function(mode) {
            assert.strictEqual(mode, 'mute');
            return roomMembershipService.getMemberLurkStatus(troupeId2, userId1);
          })
          .then(function(lurking) {
            assert.strictEqual(lurking, true);
            return roomMembershipService.setMembershipMode(userId1, troupeId2, 'all');
          })
          .then(function() {
            // Check that the event emitter fired
            assert.strictEqual(2, this.onMembersLurkChange.callCount);
            var spyCall = this.onMembersLurkChange.getCall(1);

            assert.strictEqual(troupeId2, spyCall.args[0]);
            assert.deepEqual([userId1], spyCall.args[1]);
            assert.strictEqual(false, spyCall.args[2]);

            return roomMembershipService.getMembershipMode(userId1, troupeId2);
          })
          .then(function(mode) {
            assert.strictEqual(mode, 'all');
            return roomMembershipService.getMemberLurkStatus(troupeId2, userId1);
          })
          .then(function(lurking) {
            assert.strictEqual(lurking, false);
            return roomMembershipService.setMembershipMode(userId1, troupeId2, 'all');
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
        });

    });

    describe('findRoomIdsForUserWithLurk', function() {
      it('should return the correct values', function() {
        var troupeId2 = fixture.troupe2.id;
        var userId1 = fixture.user1.id;
        var userId2 = fixture.user2.id;

        return roomMembershipService.addRoomMembers(troupeId2, [userId1, userId2])
          .then(function() {
            return [
              roomMembershipService.setMembershipMode(userId1, troupeId2, 'all'),
              roomMembershipService.setMembershipMode(userId2, troupeId2, 'mute')
            ];
          })
          .spread(function() {
            return roomMembershipService.findRoomIdsForUserWithLurk(userId1);
          })
          .then(function(result) {
            assert(typeof result === 'object');
            assert(!!result);
            assert(result.hasOwnProperty(troupeId2));
            assert.strictEqual(result[troupeId2], false);

            return roomMembershipService.findRoomIdsForUserWithLurk(userId2);
          })
          .then(function(result) {
            assert(typeof result === 'object');
            assert(!!result);
            assert(result.hasOwnProperty(troupeId2));
            assert.strictEqual(result[troupeId2], true);
          });

      });

    });

    describe('addRoomMember', function() {
      it('should add a new member to a room', function() {
        var troupeId = fixture.troupe2.id;
        var userId = fixture.user1.id;

        var called = 0;
        function listener(pTroupeId, members) {
          assert.strictEqual(pTroupeId, troupeId);
          assert.deepEqual(members, [userId]);
          called++;
        }

        return roomMembershipService.removeRoomMember(troupeId, userId)
          .then(function() {
            roomMembershipService.events.on('members.added', listener);
            return roomMembershipService.addRoomMember(troupeId, userId);
          })
          .then(function(result) {
            assert.strictEqual(result, true);
            assert.strictEqual(called, 1);
          })
          .finally(function() {
            roomMembershipService.events.removeListener('members.added', listener);
          });

      });

      it('should be idempotent', function() {
        var troupeId = fixture.troupe2.id;
        var userId = fixture.user1.id;

        var called = 0;
        function listener() {
          called++;
        }

        return roomMembershipService.addRoomMember(troupeId, userId)
          .then(function() {
            roomMembershipService.events.on('members.added', listener);
            return roomMembershipService.addRoomMember(troupeId, userId);
          })
          .then(function(result) {
            assert.strictEqual(result, false);
            assert.strictEqual(called, 0);
          })
          .finally(function() {
            roomMembershipService.events.removeListener('members.added', listener);
          });

      });
    });

    describe('findUserMembershipInRooms', function() {
      it('should return some users', function() {
        var troupeId1 = fixture.troupe1.id;
        var troupeId2 = fixture.troupe2.id;
        var userId = fixture.user1.id;

        return Promise.join(
            roomMembershipService.removeRoomMember(troupeId1, userId),
            roomMembershipService.addRoomMember(troupeId2, userId),
            function() {
              return roomMembershipService.findUserMembershipInRooms(userId, [troupeId1, troupeId2]);
            })
            .then(function(result) {
              assert.strictEqual(result.length, 1);
              assert.equal(result[0], troupeId2);
            });
      });

    });

    describe('findMembershipForUsersInRoom', function() {
      it('should return some users', function() {
        var troupeId = fixture.troupe1.id;
        var userId1 = fixture.user1.id;
        var userId2 = fixture.user2.id;

        return Promise.join(
            roomMembershipService.removeRoomMember(troupeId, userId1),
            roomMembershipService.addRoomMember(troupeId, userId2),
            function() {
              return roomMembershipService.findMembershipForUsersInRoom(troupeId, [userId1, userId2]);
            })
            .then(function(result) {
              assert.strictEqual(result.length, 1);
              assert.equal(result[0], userId2);
            });
      });

    });

    describe('findMembersForRoomWithLurk', function() {
      it('should return some users with lurk', function() {
        var troupeId = fixture.troupe1.id;
        var userId1 = fixture.user1.id;
        var userId2 = fixture.user2.id;
        var userId3 = fixture.user3.id;

        return Promise.join(
            roomMembershipService.removeRoomMember(troupeId, userId1),
            roomMembershipService.addRoomMember(troupeId, userId2),
            roomMembershipService.addRoomMember(troupeId, userId3),
            function() {
              return [
                roomMembershipService.setMembershipMode(userId2, troupeId, 'all'),
                roomMembershipService.setMembershipMode(userId3, troupeId, 'mute')
              ];
            })
            .spread(function() {
              return roomMembershipService.findMembersForRoomWithLurk(troupeId, [userId1, userId2, userId3]);
            })
            .then(function(result) {
              var expected = {};
              expected[userId2] = false;
              expected[userId3] = true;
              assert.deepEqual(result, expected);
            });
      });
    });


    describe('removeRoomMember', function() {
      it('should remove a member from a room', function() {
        var troupeId = fixture.troupe2.id;
        var userId = fixture.user1.id;

        var called = 0;
        function listener(pTroupeId, members) {
          assert.strictEqual(pTroupeId, troupeId);
          assert.deepEqual(members, [userId]);
          called++;
        }

        return roomMembershipService.addRoomMember(troupeId, userId)
          .then(function() {
            roomMembershipService.events.on('members.removed', listener);

            return roomMembershipService.removeRoomMember(troupeId, userId);
          })
          .then(function(result) {
            assert.strictEqual(result, true);
            assert.strictEqual(called, 1);
          })
          .finally(function() {
            roomMembershipService.events.removeListener('members.removed', listener);
          });

      });

      it('should be idempotent', function() {
        var troupeId = fixture.troupe2.id;
        var userId = fixture.user1.id;

        var called = 0;
        function listener() {
          called++;
        }

        return roomMembershipService.removeRoomMember(troupeId, userId)
          .then(function() {
            roomMembershipService.events.on('members.removed', listener);
            return roomMembershipService.removeRoomMember(troupeId, userId);
          })
          .then(function(result) {
            assert.strictEqual(result, false);
            assert.strictEqual(called, 0);
          })
          .finally(function() {
            roomMembershipService.events.removeListener('members.removed', listener);
          });

      });

    });

    describe('findAllMembersForRooms', function() {
      it('should return some users', function() {
        var troupeId1 = fixture.troupe1.id;
        var troupeId2 = fixture.troupe2.id;
        var userId1 = fixture.user1.id;
        var userId2 = fixture.user2.id;
        var userId3 = fixture.user3.id;

        return Promise.join(
            roomMembershipService.removeRoomMember(troupeId1, userId3),
            roomMembershipService.removeRoomMember(troupeId2, userId3),
            roomMembershipService.addRoomMember(troupeId1, userId1),
            roomMembershipService.addRoomMember(troupeId1, userId2),
            roomMembershipService.addRoomMember(troupeId2, userId1),
            function() {
              return roomMembershipService.findAllMembersForRooms([troupeId1, troupeId2]);
            })
            .then(function(result) {
              assert.strictEqual(result.length, 2);
              assert(result.some(mongoIdEqualPredicate(userId1)));
              assert(result.some(mongoIdEqualPredicate(userId2)));
              assert(!result.some(mongoIdEqualPredicate(userId3)));
            });
      });
    });

    describe('findMembersForRoomMulti', function() {
      it('should return some users', function() {
        var troupeId1 = fixture.troupe1.id;
        var troupeId2 = fixture.troupe2.id;
        var userId1 = fixture.user1.id;
        var userId2 = fixture.user2.id;
        var userId3 = fixture.user3.id;

        return Promise.join(
            roomMembershipService.removeRoomMember(troupeId1, userId3),
            roomMembershipService.removeRoomMember(troupeId2, userId3),
            roomMembershipService.addRoomMember(troupeId1, userId1),
            roomMembershipService.addRoomMember(troupeId1, userId2),
            roomMembershipService.addRoomMember(troupeId2, userId1),
            roomMembershipService.removeRoomMember(troupeId2, userId2),
            function() {
              return roomMembershipService.findMembersForRoomMulti([troupeId1, troupeId2]);
            })
            .then(function(result) {
              assert.strictEqual(Object.keys(result).length, 2);
              var t1 = result[troupeId1];
              var t2 = result[troupeId2];
              assert(Array.isArray(t1));
              assert(Array.isArray(t2));

              assert(t1.some(mongoIdEqualPredicate(userId1)));
              assert(t1.some(mongoIdEqualPredicate(userId2)));
              assert(!t1.some(mongoIdEqualPredicate(userId3)));

              assert(t2.some(mongoIdEqualPredicate(userId1)));
              assert(!t2.some(mongoIdEqualPredicate(userId2)));
              assert(!t2.some(mongoIdEqualPredicate(userId3)));
            });
      });

    });

    describe('setMembershipModeForUsersInRoom', function() {
      it('should return some users', function() {
        var troupeId1 = fixture.troupe1.id;
        var userId1 = fixture.user1.id;
        var userId2 = fixture.user2.id;

        return Promise.join(
            roomMembershipService.addRoomMember(troupeId1, userId1),
            roomMembershipService.addRoomMember(troupeId1, userId2),
            function() {
              return roomMembershipService.setMembershipModeForUsersInRoom(troupeId1, [userId1, userId2], 'all');
            })
            .then(function() {
              return roomMembershipService.findMembershipModeForUsersInRoom(troupeId1, [userId1, userId2]);
            })
            .then(function(result) {
              var expected = {};
              expected[userId1] = 'all';
              expected[userId2] = 'all';
              assert.deepEqual(result, expected);

              return roomMembershipService.setMembershipModeForUsersInRoom(troupeId1, [userId1], 'announcement');
            })
            .then(function() {
              return roomMembershipService.findMembershipModeForUsersInRoom(troupeId1, [userId1, userId2]);
            })
            .then(function(result) {
              var expected = {};
              expected[userId1] = 'announcement';
              expected[userId2] = 'all';
              assert.deepEqual(result, expected);

              return roomMembershipService.setMembershipModeForUsersInRoom(troupeId1, [userId2], 'mute');
            })
            .then(function() {
              return roomMembershipService.findMembershipModeForUsersInRoom(troupeId1, [userId1, userId2]);
            })
            .then(function(result) {
              var expected = {};
              expected[userId1] = 'announcement';
              expected[userId2] = 'mute';
              assert.deepEqual(result, expected);

              return roomMembershipService.setMembershipModeForUsersInRoom(troupeId1, [userId1, userId2], 'all');
            })
            .then(function() {
              return roomMembershipService.findMembershipModeForUsersInRoom(troupeId1, [userId1, userId2]);
            })
            .then(function(result) {
              var expected = {};
              expected[userId1] = 'all';
              expected[userId2] = 'all';
              assert.deepEqual(result, expected);
            });

      });
    });

  });

});
