'use strict';

var groupService = require('../lib/group-service');
var assert = require('assert');
var StatusError = require('statuserror');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var securityDescriptorService = require('gitter-web-permissions/lib/security-descriptor-service');

describe('group-service', function() {

  describe('integration tests #slow', function() {

    describe('createGroup', function() {
      var fixture = fixtureLoader.setup({
        deleteDocuments: {
          User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }],
          Group: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() },
                  { lcUri: fixtureLoader.GITTER_INTEGRATION_REPO.toLowerCase() },
                  { lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() },
                  { lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() }],
        },
        user1: {
          githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN,
          username: fixtureLoader.GITTER_INTEGRATION_USERNAME
        }
      });

      it('should create a group for a GitHub org', function() {
        var groupUri = fixtureLoader.GITTER_INTEGRATION_ORG;
        var user = fixture.user1;
        return groupService.createGroup(user, {
            type: 'GH_ORG',
            name: 'Bob',
            uri: groupUri,
            linkPath: groupUri
          })
          .then(function(group) {
            assert.strictEqual(group.name, 'Bob');
            assert.strictEqual(group.uri, groupUri);
            assert.strictEqual(group.lcUri, groupUri.toLowerCase());
            return securityDescriptorService.getForGroupUser(group._id, null);
          })
          .then(function(securityDescriptor) {
            assert.deepEqual(securityDescriptor, {
              admins: 'GH_ORG_MEMBER',
              externalId: fixtureLoader.GITTER_INTEGRATION_ORG_ID,
              linkPath: fixtureLoader.GITTER_INTEGRATION_ORG,
              members: 'PUBLIC',
              public: true,
              type: 'GH_ORG'
            })
          })
      });

      it('should create a group for a GitHub repo', function() {
        var groupUri = fixtureLoader.GITTER_INTEGRATION_REPO;
        var linkPath = fixtureLoader.GITTER_INTEGRATION_REPO_FULL;
        var user = fixture.user1;
        return groupService.createGroup(user, {
            type: 'GH_REPO',
            name: 'Bob',
            uri: groupUri,
            linkPath: linkPath
          })
          .then(function(group) {
            assert.strictEqual(group.name, 'Bob');
            assert.strictEqual(group.uri, groupUri);
            assert.strictEqual(group.lcUri, groupUri.toLowerCase());
            return securityDescriptorService.getForGroupUser(group._id, null);
          })
          .then(function(securityDescriptor) {
            assert.deepEqual(securityDescriptor, {
              admins: 'GH_REPO_PUSH',
              externalId: fixtureLoader.GITTER_INTEGRATION_REPO_ID,
              linkPath: linkPath,
              members: 'PUBLIC',
              public: true,
              type: 'GH_REPO'
            })
          })
      });

      it('should create a group for an unknown GitHub owner', function() {
        var groupUri = fixtureLoader.GITTER_INTEGRATION_USERNAME;
        var user = fixture.user1;
        return groupService.createGroup(user, {
            type: 'GH_GUESS',
            name: 'Bob',
            uri: groupUri,
            linkPath: groupUri
          })
          .then(function(group) {
            assert.strictEqual(group.name, 'Bob');
            assert.strictEqual(group.uri, groupUri);
            assert.strictEqual(group.lcUri, groupUri.toLowerCase());
            return securityDescriptorService.getForGroupUser(group._id, null);
          })
          .then(function(securityDescriptor) {
            assert.deepEqual(securityDescriptor, {
              admins: 'GH_USER_SAME',
              externalId: fixtureLoader.GITTER_INTEGRATION_USER_ID,
              linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME,
              members: 'PUBLIC',
              public: true,
              type: 'GH_USER'
            })
          })
      });

      it('should create a group for a new style community', function() {
        var user = fixture.user1;
        return groupService.createGroup(user, {
            name: 'Bob',
            uri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY
          })
          .then(function(group) {
            assert.strictEqual(group.name, 'Bob');
            assert.strictEqual(group.uri, fixtureLoader.GITTER_INTEGRATION_COMMUNITY);
            assert.strictEqual(group.lcUri, fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase());
            return securityDescriptorService.getForGroupUser(group._id, null);
          })
          .then(function(securityDescriptor) {
            assert.deepEqual(securityDescriptor, {
              type: null,
              admins: 'MANUAL',
              public: true,
              members: 'PUBLIC'
            })
          })
      });
    });

    describe('findById #slow', function() {
      var fixture = fixtureLoader.setup({
        group1: {},
      });

      it('should find a group', function() {
        return groupService.findById(fixture.group1._id)
          .then(function(group) {
            assert.strictEqual(group.name, fixture.group1.name);
            assert.strictEqual(group.uri, fixture.group1.uri);
            assert.strictEqual(group.lcUri, fixture.group1.lcUri);
          });

      });
    });

    describe('ensureGroupForGitHubRoomCreation', function() {
      var fixture = fixtureLoader.setup({
        deleteDocuments: {
          User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }],
          Group: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() }],
        },
        user1: {
          githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN,
          username: fixtureLoader.GITTER_INTEGRATION_USERNAME
        }
      });

      it('should create a room for a repo', function() {
        return groupService.migration.ensureGroupForGitHubRoomCreation(fixture.user1, {
          uri: fixtureLoader.GITTER_INTEGRATION_ORG,
          name: 'BOB',
          obtainAccessFromGitHubRepo: fixtureLoader.GITTER_INTEGRATION_REPO_FULL
        })
        .then(function(group) {
          return securityDescriptorService.getForGroupUser(group._id, fixture.user1._id);
        })
        .then(function(securityDescriptor) {
          assert.deepEqual({
            admins: "GH_ORG_MEMBER",
            externalId: fixtureLoader.GITTER_INTEGRATION_ORG_ID,
            linkPath: "gitter-integration-tests-organisation",
            members: "PUBLIC",
            public: true,
            type: "GH_ORG",
          }, securityDescriptor);
        })

      });

      it('should create a room for a user', function() {
        return groupService.migration.ensureGroupForGitHubRoomCreation(fixture.user1, {
          uri: fixture.user1.username,
          name: 'BOB'
        })
        .then(function(group) {
          return securityDescriptorService.getForGroupUser(group._id, fixture.user1._id);
        })
        .then(function(securityDescriptor) {
          assert.strictEqual(securityDescriptor.admins, 'GH_USER_SAME');
          assert.strictEqual(securityDescriptor.externalId, fixtureLoader.GITTER_INTEGRATION_USER_ID);
          assert.deepEqual(securityDescriptor.extraAdmins, []);
          assert.equal(securityDescriptor.public, true);
          assert.equal(securityDescriptor.members, 'PUBLIC');
          assert.equal(securityDescriptor.linkPath, fixtureLoader.GITTER_INTEGRATION_USERNAME);
          assert.equal(securityDescriptor.type, 'GH_USER');
        });
      });
    });

    describe('findRoomsIdForGroup', function() {
      var fixture = fixtureLoader.setup({
        user1: {},
        user2: {},
        group1: {},
        troupe1: { group: 'group1', security: 'PUBLIC' },
        troupe2: { group: 'group1', security: 'PUBLIC' },
        troupe3: { group: 'group1', security: 'PRIVATE', users: ['user1'] },
        troupe4: { group: 'group1', security: 'PRIVATE' },
      });

      it('should find the roomIds for group for an anonymous user', function() {
        return groupService.findRoomsIdForGroup(fixture.group1._id)
          .then(function(roomIds) {
            assert.deepEqual(roomIds.map(String), [
              fixture.troupe1.id,
              fixture.troupe2.id,
            ]);
          });
      });

      it('should find the roomIds for group and user with troupes', function() {
        return groupService.findRoomsIdForGroup(fixture.group1._id, fixture.user1._id)
          .then(function(roomIds) {
            assert.deepEqual(roomIds.map(String), [
              fixture.troupe1.id,
              fixture.troupe2.id,
              fixture.troupe3.id
            ]);
          });
      });

      it('should find the roomIds for group and user without troupes', function() {
        return groupService.findRoomsIdForGroup(fixture.group1._id, fixture.user2._id)
          .then(function(roomIds) {
            assert.deepEqual(roomIds.map(String), [
              fixture.troupe1.id,
              fixture.troupe2.id,
            ]);
          });
      });
    });

    describe('ensureGroupForRoom', function() {
    });

  });

})
