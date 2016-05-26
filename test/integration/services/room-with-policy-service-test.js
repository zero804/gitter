"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var fixtureLoader = require('../test-fixtures');
var Promise = require('bluebird');
var StatusError = require('statuserror');
var persistence = require('gitter-web-persistence');
var RoomWithPolicyService = testRequire('./services/room-with-policy-service');

describe('room-with-policy-service', function() {
    var fixture = {};
    before(fixtureLoader(fixture, {
      user1: {
      },
      userStaff: {
        staff: true
      },
      troupe1: {
        users: ['user1']
      },
      troupeWithReservedTags: {
        tags: [
          'foo:bar',
          'foo'
        ]
      },
      troupeBan: {
        security: 'PUBLIC',
        githubType: 'REPO',
        users: ['userBan', 'userBanAdmin']
      },
      troupeBan2: {
        security: 'PUBLIC',
        githubType: 'REPO',
        users: ['userBan', 'userBanAdmin']
      },
      userBan: { },
      userBanAdmin: {},
      troupeForDeletion: {}
    }));

    after(function() { fixture.cleanup(); });

  var isAdminPolicy = {
    canAdmin: function() {
      return Promise.resolve(true);
    },
    canJoin: function(){
      return Promise.resolve(true);
    }
  };

  var notAdminPolicy = {
    canAdmin: function() {
      return Promise.resolve(false);
    }
  };

  describe('updateTags #slow', function() {
    it('should update tags', function() {
      var rawTags = 'js, open source,    looooooooooooooooooooooooooooongtag,,,,';
      var cleanTags = ['js','open source', 'looooooooooooooooooo'];
      var r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, isAdminPolicy);
      return r.updateTags(rawTags)
        .then(function(troupe) {
          assert.deepEqual(troupe.tags.toObject(), cleanTags);
        });
    });

    it('should not save reserved-word tags(colons) with normal-user', function() {
      var rawTags = 'hey, foo:bar, there';
      var cleanTags = ['hey', 'there'];

      var r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, isAdminPolicy);
      return r.updateTags(rawTags)
        .then(function(troupe) {
          assert.deepEqual(troupe.tags.toObject(), cleanTags);
        });
    });

    it('should deny a non-admin', function() {
      var rawTags = 'hey, foo:bar, there';

      var r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, notAdminPolicy);
      return r.updateTags(rawTags)
        .then(function() {
          assert.ok(false);
        })
        .catch(StatusError, function(err) {
          assert.strictEqual(err.status, 403);
        });
    });

    it('should save reserved-word tags with staff-user', function() {
      var rawTags = 'hey, foo:bar, there';
      var cleanTags = ['hey', 'foo:bar', 'there'];

      var r = new RoomWithPolicyService(fixture.troupe1, fixture.userStaff, notAdminPolicy);
      return r.updateTags(rawTags)
        .then(function(troupe) {
          assert.deepEqual(troupe.tags.toObject(), cleanTags);
        });
    });

    it('should retain reserved-word tags with normal-user', function() {
      var fixtureTags = 'foo:bar, foo';
      var userTags = 'hey, there';
      var userActualTags = ['hey', 'there', 'foo:bar'];

      var r1 = new RoomWithPolicyService(fixture.troupeWithReservedTags, fixture.userStaff, notAdminPolicy);
      var r2 = new RoomWithPolicyService(fixture.troupeWithReservedTags, fixture.user1, isAdminPolicy);

      return r1.updateTags(fixtureTags)
        .then(function() {
          return r2.updateTags(userTags);
        })
        .then(function(troupe) {
          assert.deepEqual(troupe.tags.toObject(), userActualTags);
        });
    });
  });

  describe('bans #slow', function() {

    it('should ban users from rooms #slow', function() {
      var roomService = testRequire("./services/room-service");
      var roomMembershipService = testRequire('./services/room-membership-service');
      var userBannedFromRoom = require('gitter-web-permissions/lib/user-banned-from-room');

      var r = new RoomWithPolicyService(fixture.troupeBan, fixture.userBanAdmin, isAdminPolicy);

      return userBannedFromRoom(fixture.troupeBan.uri, fixture.userBan)
        .then(function(banned) {
          assert(!banned);

          return r.banUserFromRoom(fixture.userBan.username, {})
            .then(function(ban) {
              assert.equal(ban.userId, fixture.userBan.id);
              assert.equal(ban.bannedBy, fixture.userBanAdmin.id);
              assert(ban.dateBanned);

              return roomMembershipService.checkRoomMembership(fixture.troupeBan._id, fixture.userBan.id);
            })
            .then(function(bannedUserIsInRoom) {
              assert(!bannedUserIsInRoom);

              return roomService.findBanByUsername(fixture.troupeBan.id, fixture.userBan.username);
            })
            .then(function(ban) {
              assert(ban);
              assert(ban.userId);

              return userBannedFromRoom(fixture.troupeBan.uri, fixture.userBan)
                .then(function(banned) {
                  assert(banned);

                  return r.unbanUserFromRoom(ban.userId)
                    .then(function() {
                      return userBannedFromRoom(fixture.troupeBan.uri, fixture.userBan)
                        .then(function(banned) {
                          assert(!banned);

                          return roomService.findBanByUsername(fixture.troupeBan.id, fixture.userBan.username);
                        })
                        .then(function(ban) {
                          assert(!ban);
                        });
                    });
                });
            });
        });

    });

    it('should not allow admins to be banned', function() {

      var RoomWithPolicyService = testRequire.withProxies('./services/room-with-policy-service', {
        'gitter-web-permissions/lib/legacy-policy-factory': {
          createPolicyForRoom: function(user, room) {
            assert.strictEqual(user.id, fixture.userBan.id);
            assert.strictEqual(room.id, fixture.troupeBan2.id);
            return Promise.resolve({
              canAdmin: function() {
                return Promise.resolve(true);
              }
            });
          }
        }
      })

      var r = new RoomWithPolicyService(fixture.troupeBan2, fixture.userBanAdmin, isAdminPolicy);

      return r.banUserFromRoom(fixture.userBan.username, {})
        .then(function() {
          assert(false, 'Expected to fail as banned user is an admin');
        })
        .catch(StatusError, function(err) {
          assert.equal(err.status, 403);
        });

    });

    it('should not allow non-admins to ban', function() {
      var r = new RoomWithPolicyService(fixture.troupeBan2, fixture.userBanAdmin, notAdminPolicy);

      return r.banUserFromRoom(fixture.userBan.username, {})
        .then(function() {
          assert(false, 'Expected to fail');
        })
        .catch(StatusError, function(err) {
          assert.equal(err.status, 403);
        });

    });

  });

  describe('welcome message', function(){
   it('should allow you to create a welcome message', function(){
    var welcomeMessage = 'this is a test';
    var r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, isAdminPolicy);
    return r.updateRoomWelcomeMessage({ welcomeMessage: welcomeMessage })
      .then(function(){
        return r.getRoomWelcomeMessage();
      })
      .then(function(result){
        assert(result.text);
        assert(result.html);
        assert.equal(result.text, welcomeMessage);
      });
    });
  });

  describe('delete room', function() {
    it('should allow an admin to delete a room', function() {
      var r = new RoomWithPolicyService(fixture.troupeForDeletion, fixture.user1, isAdminPolicy);
      return r.deleteRoom()
        .then(function() {
          return persistence.Troupe.findById(fixture.troupeForDeletion._id)
            .then(function(troupe) {
              assert(!troupe);
            });
        });
    });

    it('should not allow a non-admin to delete a room', function() {
      var r = new RoomWithPolicyService(fixture.troupeForDeletion, fixture.user1, notAdminPolicy);
      return r.deleteRoom()
        .catch(StatusError, function(err) {
          assert.equal(err.status, 403);
        });
    });

  });

});
