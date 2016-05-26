"use strict";

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

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
        securityDescriptor: {
          type: null,
          members: 'PUBLIC',
          admins: 'MANUAL',
          public: true,
          linkPath: null,
          externalId: null,
          extraMembers: ['user1'],
          extraAdmins: ['user1', 'user3']
        }
      },
      troupe2: {
        users: ['user1'],
        securityDescriptor: {
          type: null,
          members: 'INVITE',
          admins: 'MANUAL',
          public: false,
          linkPath: null,
          externalId: null,
          extraMembers: [],
          extraAdmins: []
        }
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

  });
});
