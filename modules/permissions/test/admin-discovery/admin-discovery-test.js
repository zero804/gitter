"use strict";

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var proxyquireNoCallThru = require("proxyquire").noCallThru();


describe('admin-discovery', function() {
  describe('integration tests #slow', function() {
    var adminDiscovery;
    var githubOrgs;
    var URI = fixtureLoader.generateUri();

    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      group1: {
        securityDescriptor: {
          type: 'GH_ORG',
          members: 'PUBLIC',
          admins: 'GH_ORG_MEMBER',
          public: true,
          linkPath: URI,
          externalId: null,
          extraAdmins: ['user1']
        }
      },

    });

    beforeEach(function() {
      githubOrgs = null;
      adminDiscovery = proxyquireNoCallThru('../../lib/admin-discovery/index', {
        './github-org': function() {
          return Promise.resolve(githubOrgs)
        }
      });
    })

    describe('discoverAdminGroups', function() {

      it('should return nothing for users who are not admins of any groups', function() {
        return adminDiscovery.discoverAdminGroups(fixture.user2)
          .then(function(groups) {
            assert.deepEqual(groups, []);
          });
      });

      it('should return groups where the user is in the GH_ORG', function() {
        githubOrgs = {
          type: 'GH_ORG',
          linkPath: [URI]
        }

        return adminDiscovery.discoverAdminGroups(fixture.user2)
          .then(function(groups) {
            assert.strictEqual(groups.length, 1);
            assert.strictEqual(String(groups[0]._id), String(fixture.group1._id));
          });
      });

    });

    it('should return rooms where the user is in extraAdmins', function() {
      return adminDiscovery.discoverAdminGroups(fixture.user1)
        .then(function(groups) {
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), String(fixture.group1._id));
        });
    });

    it('should return rooms where the user is in extraAdmins and an org member without dups', function() {
      githubOrgs = {
        type: 'GH_ORG',
        linkPath: [URI]
      }

      return adminDiscovery.discoverAdminGroups(fixture.user1)
        .then(function(groups) {
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), String(fixture.group1._id));
        });
    });


  });
});
