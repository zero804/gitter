'use strict';

var groupService = require('../lib/group-service');
var assert = require('assert');
var fixtureLoader = require('../../../test/integration/test-fixtures');
var securityDescriptorService = require('gitter-web-permissions/lib/security-descriptor-service');

describe('group-service', function() {

  describe('integration tests #slow', function() {

      var fixture = {};
      before(fixtureLoader(fixture, {
        deleteDocuments: {
          User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }],
          Group: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() }],
        },
        user1: {
          githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN,
          username: fixtureLoader.GITTER_INTEGRATION_USERNAME
        },
        group1: {},
        troupe1: {}
      }));

      after(function() {
        return fixture.cleanup();
      });

      describe('createGroup', function() {
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

        it('should find a group', function() {
          return groupService.findById(fixture.group1._id)
            .then(function(group) {
              assert.strictEqual(group.name, fixture.group1.name);
              assert.strictEqual(group.uri, fixture.group1.uri);
              assert.strictEqual(group.lcUri, fixture.group1.lcUri);
            });

        });
      });

  })

})
