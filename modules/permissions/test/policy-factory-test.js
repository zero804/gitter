"use strict";

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('../../../test/integration/test-fixtures');

var policyFactory = require('../lib/policy-factory');

describe('policy-factory', function() {
  describe('integration tests #slow', function() {

    var fixture = {};
    before(fixtureLoader(fixture, {
      user1: {},
      user2: {},
      user3: {},
      troupe1: {
        users: ['user1'],

        type: 'NONE',
        members: 'PUBLIC',
        admins: 'MANUAL',
        public: true,
        linkPath: 'gitterHQ/gitter',
        externalId: null,
        extraMembers: ['user1'],
        extraAdmins: ['user1', 'user3']
      },
      troupe2: {
        users: ['user1'],
        type: 'NONE',
        members: 'INVITE',
        admins: 'MANUAL',
        public: true,
        linkPath: 'gitterHQ/gitter',
        externalId: null,
        extraMembers: [],
        extraAdmins: []
      }
    }));

    after(function() { fixture.cleanup(); });

    describe('createPolicyForRoomId', function() {
      function checkPolicyForRoom(user, room, expected) {
        var roomId = room._id;

        return policyFactory.createPolicyForRoomId(user, roomId)
          .then(function(policy) {
            return Promise.props({
              canRead: policy.canRead(),
              canJoin: policy.canJoin(),
              canAdmin: policy.canAdmin(),
              canAddUser: policy.canAddUser(),
            });
          })
          .then(function(results) {
            assert.deepEqual(results, expected);
          });
      }

      it('public room member, admin', function() {
        return checkPolicyForRoom(fixture.user1, fixture.troupe1, {
          canRead: true,
          canJoin: true,
          canAdmin: true,
          canAddUser: true
        });
      });

      it('public room not member, not admin', function() {
        return checkPolicyForRoom(fixture.user2, fixture.troupe1, {
          canRead: true,
          canJoin: true,
          canAdmin: false,
          canAddUser: true
        });
      });

      it('invite room is member, not admin', function() {
        return checkPolicyForRoom(fixture.user1, fixture.troupe2, {
          canRead: true,
          canJoin: true,
          canAdmin: false,
          canAddUser: true
        });
      });

      it('invite room not member, not admin', function() {
        return checkPolicyForRoom(fixture.user2, fixture.troupe2, {
          canRead: false,
          canJoin: false,
          canAdmin: false,
          canAddUser: false
        });
      });

      it('invite room not member, is admin', function() {
        return checkPolicyForRoom(fixture.user3, fixture.troupe1, {
          canRead: true,
          canJoin: true,
          canAdmin: true,
          canAddUser: true
        });
      });

    });

    describe('loadRoomPermissions', function() {
      it('should load all the fields', function() {
        var userId = fixture.user1._id;
        var roomId = fixture.troupe1._id;

        return policyFactory.testOnly.loadRoomPermissions(roomId, userId)
          .then(function(perms) {
            assert.deepEqual(perms, {
              admins: "MANUAL",
              externalId: null,
              linkPath: "gitterHQ/gitter",
              members: "PUBLIC",
              oneToOne: false,
              public: true,
              type: "NONE",
              extraMembers: [userId],
              extraAdmins: [userId]
            });
          });
      })

    });

  });
});
