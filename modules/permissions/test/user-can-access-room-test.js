"use strict";

var assert = require('assert');
var Promise = require('bluebird');
var testGenerator = require('../../../test/integration/test-generator');
var proxyquireNoCallThru = require("proxyquire").noCallThru();

// All of our fixtures
var FIXTURES = [{
  name: 'user-is-in-room-public-room',
  meta: {
    banned: false,
    anonymous: false,
    inRoom: true,
    roomSecurity: 'PUBLIC',
    roomGithubType: 'ORG_CHANNEL',
  },
  tests: [
    { requestedPerm: 'read', expectedResult: true },
    { requestedPerm: 'write', recentCheck: false, expectedResult: true },
    { requestedPerm: 'write', recentCheck: true, expectedResult: true },
  ]
}, {
  name: 'banned-users-never-get-access',
  meta: {
    banned: true,
    anonymous: false,
  },
  tests: [
    { requestedPerm: 'read', roomGithubType: 'ORG_CHANNEL', roomSecurity: 'PUBLIC', inRoom: true, expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'ORG_CHANNEL', roomSecurity: 'PUBLIC', inRoom: false, expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'REPO_CHANNEL', roomSecurity: 'PUBLIC', inRoom: true, expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'REPO_CHANNEL', roomSecurity: 'PUBLIC', inRoom: false, expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'REPO', roomSecurity: 'PUBLIC', inRoom: true, expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'REPO', roomSecurity: 'PUBLIC', inRoom: false, expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'ORG_CHANNEL', roomSecurity: 'PUBLIC', inRoom: true, expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'ORG_CHANNEL', roomSecurity: 'PUBLIC', inRoom: false, expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'REPO_CHANNEL', roomSecurity: 'PUBLIC', inRoom: true, expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'REPO_CHANNEL', roomSecurity: 'PUBLIC', inRoom: false, expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'REPO', roomSecurity: 'PUBLIC', inRoom: true, expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'REPO', roomSecurity: 'PUBLIC', inRoom: false, expectedResult: false },
  ]
}, {
  name: 'anonymous-users-can-only-view-public-rooms',
  meta: {
    banned: false,
    anonymous: true,
    recentCheck: false
  },
  tests: [
    { requestedPerm: 'read', roomGithubType: 'REPO', roomSecurity: 'PUBLIC', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'REPO', roomSecurity: 'PRIVATE', expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'REPO_CHANNEL', roomSecurity: 'PUBLIC', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'REPO_CHANNEL', roomSecurity: 'INHERITED', expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'REPO_CHANNEL', roomSecurity: 'PRIVATE', expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'ORG_CHANNEL', roomSecurity: 'PUBLIC', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'ORG_CHANNEL', roomSecurity: 'INHERITED', expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'ORG_CHANNEL', roomSecurity: 'PRIVATE', expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'USER_CHANNEL', roomSecurity: 'PUBLIC', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'USER_CHANNEL', roomSecurity: 'PRIVATE', expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'ORG', roomSecurity: null, expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'REPO', roomSecurity: 'PUBLIC', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'REPO', roomSecurity: 'PRIVATE', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'REPO_CHANNEL', roomSecurity: 'PUBLIC', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'REPO_CHANNEL', roomSecurity: 'INHERITED', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'REPO_CHANNEL', roomSecurity: 'PRIVATE', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'ORG_CHANNEL', roomSecurity: 'PUBLIC', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'ORG_CHANNEL', roomSecurity: 'INHERITED', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'ORG_CHANNEL', roomSecurity: 'PRIVATE', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'USER_CHANNEL', roomSecurity: 'PUBLIC', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'USER_CHANNEL', roomSecurity: 'PRIVATE', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'ORG', roomSecurity: null, expectedResult: false }
  ]
}, {
  name: 'non-members-can-never-access-private-channels',
  meta: {
    banned: false,
    anonymous: false,
    roomSecurity: 'PRIVATE',
    inRoom: false,
  },
  tests: [
    { requestedPerm: 'read', roomGithubType: 'REPO_CHANNEL', expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'USER_CHANNEL', expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'ORG_CHANNEL', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'REPO_CHANNEL', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'USER_CHANNEL', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'ORG_CHANNEL', expectedResult: false }
  ]
}, {
  name: 'non-members-can-access-public-rooms',
  meta: {
    banned: false,
    anonymous: false,
    roomSecurity: 'PUBLIC',
    inRoom: false,
    recentCheck: false,
    roomPermissionsGrantsAccess: false
  },
  tests: [
    { requestedPerm: 'read', roomGithubType: 'REPO', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'REPO_CHANNEL', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'USER_CHANNEL', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'ORG_CHANNEL', expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'REPO', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'REPO_CHANNEL', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'USER_CHANNEL', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'ORG_CHANNEL', expectedResult: false }
  ]
}, {
  name: 'members-can-access-private-channels',
  meta: {
    banned: false,
    anonymous: false,
    roomSecurity: 'PRIVATE',
    inRoom: true,
  },
  tests: [
    { requestedPerm: 'read', roomGithubType: 'REPO_CHANNEL', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'USER_CHANNEL', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'ORG_CHANNEL', expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'REPO_CHANNEL', expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'USER_CHANNEL', expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'ORG_CHANNEL', expectedResult: true }
  ]
},{
  name: 'one-to-ones',
  meta: {
    banned: false,
    anonymous: false,
    roomSecurity: null, // One-to-one rooms have security of `null`
    roomGithubType: 'ONETOONE',
  },
  tests: [
    { requestedPerm: 'read', inRoom: true, expectedResult: true },
    { requestedPerm: 'read', inRoom: false, expectedResult: false },
        { requestedPerm: 'write', inRoom: true, expectedResult: true },
    { requestedPerm: 'write', inRoom: false, expectedResult: false },
  ]
},{
  name: 'user-is-member-of-github-backed-room-with-recent-check',
  meta: {
    banned: false,
    anonymous: false,
    inRoom: true,
    recentCheck: true,
  },
  tests: [
    { requestedPerm: 'read', roomGithubType: 'ORG_CHANNEL', security: 'INHERITED', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'REPO_CHANNEL', security: 'INHERITED', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'REPO', security: 'PRIVATE', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'ORG', security: null, expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'ORG_CHANNEL', security: 'INHERITED', expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'REPO_CHANNEL', security: 'INHERITED', expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'REPO', security: 'PRIVATE', expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'ORG', security: null, expectedResult: true },
  ]
},{
  name: 'user-is-member-of-github-backed-room-without-recent-check-with-check-success',
  meta: {
    banned: false,
    anonymous: false,
    inRoom: true,
    recentCheck: false,
    roomPermissionsGrantsAccess: true
  },
  tests: [
    { requestedPerm: 'read', roomGithubType: 'ORG_CHANNEL', security: 'INHERITED', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'REPO_CHANNEL', security: 'INHERITED', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'REPO', security: 'PRIVATE', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'ORG', security: null, expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'ORG_CHANNEL', security: 'INHERITED', expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'REPO_CHANNEL', security: 'INHERITED', expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'REPO', security: 'PRIVATE', expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'ORG', security: null, expectedResult: true },
  ]
},{
  name: 'user-is-member-of-github-backed-room-without-recent-check-with-check-throw',
  meta: {
    banned: false,
    anonymous: false,
    inRoom: true,
    recentCheck: false,
    roomPermissionsGrantsAccess: 'throw'
  },
  tests: [
    { requestedPerm: 'read', roomGithubType: 'ORG_CHANNEL', security: 'INHERITED', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'REPO_CHANNEL', security: 'INHERITED', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'REPO', security: 'PRIVATE', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'ORG', security: null, expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'ORG_CHANNEL', security: 'INHERITED', expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'REPO_CHANNEL', security: 'INHERITED', expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'REPO', security: 'PRIVATE', expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'ORG', security: null, expectedResult: true },
  ]
},{
  name: 'user-is-member-of-github-backed-room-without-recent-check-with-check-failure',
  meta: {
    banned: false,
    anonymous: false,
    inRoom: true,
    recentCheck: false,
    roomPermissionsGrantsAccess: false,
    expectRemoveRoomMember: true
  },
  tests: [
    { requestedPerm: 'read', roomGithubType: 'ORG_CHANNEL', security: 'INHERITED', expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'REPO_CHANNEL', security: 'INHERITED', expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'REPO', security: 'PRIVATE', expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'ORG', security: null, expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'ORG_CHANNEL', security: 'INHERITED', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'REPO_CHANNEL', security: 'INHERITED', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'REPO', security: 'PRIVATE', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'ORG', security: null, expectedResult: false },
  ]
},{
  name: 'user-isnt-room-member-but-org-member-of-github-backed-room',
  meta: {
    banned: false,
    anonymous: false,
    inRoom: false,
    roomPermissionsGrantsAccess: true,
  },
  tests: [
    { requestedPerm: 'read', roomGithubType: 'ORG_CHANNEL', security: 'INHERITED', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'REPO_CHANNEL', security: 'INHERITED', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'REPO', security: 'PRIVATE', expectedResult: true },
    { requestedPerm: 'read', roomGithubType: 'ORG', security: null, expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'ORG_CHANNEL', security: 'INHERITED', expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'REPO_CHANNEL', security: 'INHERITED', expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'REPO', security: 'PRIVATE', expectedResult: true },
    { requestedPerm: 'write', roomGithubType: 'ORG', security: null, expectedResult: true },
  ]
},{
  name: 'user-isnt-room-member-but-org-member-of-github-backed-room-with-check-throw',
  meta: {
    banned: false,
    anonymous: false,
    inRoom: false,
    roomPermissionsGrantsAccess: 'throw'
  },
  tests: [
    { requestedPerm: 'read', roomGithubType: 'ORG_CHANNEL', security: 'INHERITED', expectedResult: 'throw' },
    { requestedPerm: 'read', roomGithubType: 'REPO_CHANNEL', security: 'INHERITED', expectedResult: 'throw' },
    { requestedPerm: 'read', roomGithubType: 'REPO', security: 'PRIVATE', expectedResult: 'throw' },
    { requestedPerm: 'read', roomGithubType: 'ORG', security: null, expectedResult: 'throw' },
    { requestedPerm: 'write', roomGithubType: 'ORG_CHANNEL', security: 'INHERITED', expectedResult: 'throw' },
    { requestedPerm: 'write', roomGithubType: 'REPO_CHANNEL', security: 'INHERITED', expectedResult: 'throw' },
    { requestedPerm: 'write', roomGithubType: 'REPO', security: 'PRIVATE', expectedResult: 'throw' },
    { requestedPerm: 'write', roomGithubType: 'ORG', security: null, expectedResult: 'throw' },
  ]
},{
  name: 'user-isnt-room-member-but-org-member-of-github-backed-room-with-check-failure',
  meta: {
    banned: false,
    anonymous: false,
    inRoom: false,
    roomPermissionsGrantsAccess: false,
    expectRemoveRoomMember: false
  },
  tests: [
    { requestedPerm: 'read', roomGithubType: 'ORG_CHANNEL', security: 'INHERITED', expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'REPO_CHANNEL', security: 'INHERITED', expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'REPO', security: 'PRIVATE', expectedResult: false },
    { requestedPerm: 'read', roomGithubType: 'ORG', security: null, expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'ORG_CHANNEL', security: 'INHERITED', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'REPO_CHANNEL', security: 'INHERITED', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'REPO', security: 'PRIVATE', expectedResult: false },
    { requestedPerm: 'write', roomGithubType: 'ORG', security: null, expectedResult: false },
  ]
},{
  name: 'fail-with-dodgy-room-id',
  meta: {
    roomId: 'not_a_room_id'
  },
  tests: [
    { requestedPerm: 'read', expectedResult: false },
    { requestedPerm: 'write', expectedResult: false }
  ]
},{
  name: 'fail-with-no-room-id',
  meta: {
    roomId: null
  },
  tests: [
    { requestedPerm: 'read', expectedResult: false },
    { requestedPerm: 'write', expectedResult: false }
  ]
}];

var count = 0;

describe('user-can-access-room', function() {
  testGenerator(FIXTURES, function(name, meta) {
    var banned = meta.banned;
    var anonymous = meta.anonymous;
    var inRoom = meta.inRoom;
    var roomSecurity = meta.roomSecurity;
    var roomGithubType = meta.roomGithubType;
    var recentCheck = meta.recentCheck;
    var roomPermissionsGrantsAccess = meta.roomPermissionsGrantsAccess;
    var expectedResult = meta.expectedResult;
    var expectRemoveRoomMember = meta.expectRemoveRoomMember;
    var removeRoomMemberCount = 0;
    var requestedPerm = meta.requestedPerm;

    var userId = anonymous ? null : "56587d431f74b2c84cecb8db";
    var troupeId = typeof meta.roomId === 'undefined' ? "56587cfb6628d29f4e8d150d" : meta.roomId;

    var testName = '#' + (++count) + ' ' +
      Object.keys(meta)
        .filter(function(f) { return !!meta[f]; })
        .map(function(k) { return k + '=' + meta[k]; }).join(', ');

    it(testName, function(done) {

      var persistence = {
        Troupe: {
          findById: function() {
            return {
              exec: function() {
                return Promise.resolve({
                  _id: troupeId,
                  security: roomSecurity,
                  githubType: roomGithubType,
                  bans: banned ? [userId] : undefined
                });
              }
            };
          }
        },
        User: {
          findById: function() {
            return {
              exec: function() {
                assert(!anonymous);
                return Promise.resolve({ _id: userId });
              }
            };
          }
        },
        TroupeUser: {
          count: function() {
            return {
              exec: function() {
                return Promise.resolve(inRoom ? 1 : 0);
              }
            };
          }
        }
      };

      var dolph = {
        rateLimiter: function() {
          return function(key, rate, callback) {
            if (recentCheck !== true && recentCheck !== false) {
              assert.ok(false, 'Unexpected call to rateLimiter');
            }

            return callback(null, recentCheck ? 2 : 1);
          };
        }
      };

      var roomPermissionsModel = function(user, permission, room) {
        assert(user, 'user required');
        assert(permission, 'permission required');
        assert(room, 'room required');
        assert(!anonymous);
        if (roomPermissionsGrantsAccess !== true && roomPermissionsGrantsAccess !== false && roomPermissionsGrantsAccess !== "throw" ) {
          assert.ok(false, 'Unexpected call to roomPermissionsModel');
        }

        if (roomPermissionsGrantsAccess === "throw") {
          return Promise.reject(new Error('Backend is down'));
        }

        return Promise.resolve(roomPermissionsGrantsAccess);
      };

      var appEvents = require('gitter-web-appevents').testOnly.makeEmitter();
      appEvents.onRoomMemberPermCheckFailed(function() {
        assert(expectRemoveRoomMember);
        removeRoomMemberCount++;
      });

      var userCanAccessRoom = proxyquireNoCallThru('../lib/user-can-access-room', {
        'gitter-web-persistence': persistence,
        'dolph': dolph,
        './room-permissions-model': roomPermissionsModel,
        'gitter-web-appevents': appEvents
      });

      var func;
      if (requestedPerm === 'read') {
        func = userCanAccessRoom.permissionToRead;
      } else if (requestedPerm === 'write') {
        func = userCanAccessRoom.permissionToWrite;
      } else {
        return done(new Error('requestedPerm not set'));
      }

      func(userId, troupeId)
        .then(function(result) {
          if(expectedResult !== 'throw') {
            assert.strictEqual(result, expectedResult);
            if (expectRemoveRoomMember) {
              assert.strictEqual(removeRoomMemberCount, 1);
            }
          } else {
            assert(false, 'Expected the permission model to throw an exception');
          }
        }, function(err) {
          if(expectedResult !== 'throw') throw err;

          if (expectRemoveRoomMember) {
            assert.strictEqual(removeRoomMemberCount, 1);
          }
        })
        .nodeify(done);
    });

  });
});
