'use strict';

var groupService = require('../lib/group-service');
var assert = require('assert');
var fixtureLoader = require('../../../test/integration/test-fixtures');
var securityDescriptorService = require('gitter-web-permissions/lib/security-descriptor-service');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

describe('group-service', function() {

  describe('integration tests #slow', function() {

      describe('createGroup', function() {
        var fixture = fixtureLoader.setup({
          deleteDocuments: {
            User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }],
            Group: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() }],
          },
          user1: {
            githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN,
            username: fixtureLoader.GITTER_INTEGRATION_USERNAME
          }
        });

        it('should create a group', function() {
          var groupUri = fixtureLoader.GITTER_INTEGRATION_ORG;
          var user = fixture.user1;

          return groupService.createGroup(user, { name: 'Bob', uri: groupUri })
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
            obtainAccessFromGitHubRepo: fixtureLoader.GITTER_INTEGRATION_REPO
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
            assert.strictEqual(securityDescriptor.admins, 'MANUAL');
            assert.strictEqual(securityDescriptor.externalId, null);
            assert.strictEqual(securityDescriptor.extraAdmins.length, 1);
            assert(mongoUtils.objectIDsEqual(securityDescriptor.extraAdmins[0], fixture.user1._id));
            assert.equal(securityDescriptor.public, true);
            assert.equal(securityDescriptor.members, 'PUBLIC');
            assert.equal(securityDescriptor.type, null);
          })

        });
      });
  })

})
