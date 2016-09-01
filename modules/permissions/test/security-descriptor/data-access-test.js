"use strict";

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var Group = require('gitter-web-persistence').Group;
var dataAccess = require('../../lib/security-descriptor/data-access');

describe('data-access-test', function() {

  describe('integration tests #slow', function() {
    fixtureLoader.disableMongoTableScans();

    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      user3: {},
      group1: {
        securityDescriptor: {
          type: null,
          members: 'PUBLIC',
          admins: 'MANUAL',
          public: true,
          extraMembers: ['user1'],
          extraAdmins: ['user2']
        }
      },
      group2: {
        securityDescriptor: {
          type: null,
          members: 'PUBLIC',
          admins: 'MANUAL',
          public: true,
        }
      },
      group3: {
        securityDescriptor: {
          type: null,
          members: 'PUBLIC',
          admins: 'MANUAL',
          public: true,
        }
      }
    });

    describe('findByIdForModel', function() {
      it('should findById without a user', function() {
        var groupId1 = fixture.group1.id;
        return dataAccess.findByIdForModel(Group, groupId1)
          .then(function(sd) {
            assert.strictEqual(sd.type, null);
            assert.strictEqual(sd.members, 'PUBLIC');
            assert.strictEqual(sd.admins, 'MANUAL');
            assert.strictEqual(sd.public, true);
          });
      });

      it('should findById with a user', function() {
        var groupId1 = fixture.group1.id;
        var userId1 = fixture.user1.id;
        return dataAccess.findByIdForModel(Group, groupId1, userId1)
          .then(function(sd) {
            assert.strictEqual(sd.type, null);
            assert.strictEqual(sd.members, 'PUBLIC');
            assert.strictEqual(sd.admins, 'MANUAL');
            assert.strictEqual(sd.public, true);
          });
      });
    });

    describe('findExtraAdminsForModel', function() {
      it('should find extra admins when there are', function() {
        var groupId1 = fixture.group1.id;
        return dataAccess.findExtraAdminsForModel(Group, groupId1)
          .then(function(extraAdmins) {
            assert.deepEqual(extraAdmins.map(String), [fixture.user2.id]);
          });
      });

      it('should not find extra admins when there are none', function() {
        var groupId2 = fixture.group2.id;
        return dataAccess.findExtraAdminsForModel(Group, groupId2)
          .then(function(extraAdmins) {
            assert.deepEqual(extraAdmins.map(String), []);
          });
      });
    });

    describe('findExtraMembersForModel', function() {
      it('should find extra admins when there are', function() {
        var groupId1 = fixture.group1.id;
        return dataAccess.findExtraMembersForModel(Group, groupId1)
          .then(function(extraAdmins) {
            assert.deepEqual(extraAdmins.map(String), [fixture.user1.id]);
          });
      });

      it('should not find extra admins when there are none', function() {
        var groupId2 = fixture.group2.id;
        return dataAccess.findExtraMembersForModel(Group, groupId2)
          .then(function(extraAdmins) {
            assert.deepEqual(extraAdmins.map(String), []);
          });
      });
    });

    describe('addExtraAdminForModel', function() {
      it('should add a user not in extraAdmins', function() {
        var groupId3 = fixture.group3.id;
        var userId1 = fixture.user1.id;
        return dataAccess.addExtraAdminForModel(Group, groupId3, userId1)
          .then(function() {
          });
      });
    });

  });
});
