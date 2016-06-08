"use strict";

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var securityDescriptorService = require('../lib/security-descriptor-service');
var permissionCombinations = require('./permission-combinations');
var persistence = require('gitter-web-persistence');

describe('security-descriptor-service', function() {
  describe('integration tests #slow', function() {

    permissionCombinations.forEach(function(descriptor, index) {
      it('should insert and read combination #' + index, function() {

        return persistence.Troupe.create({
            githubType: 'REPO'
          })
          .tap(function(troupe) {
            return securityDescriptorService.insertForRoom(troupe._id, descriptor)
              .then(function() {
                return securityDescriptorService.getForRoomUser(troupe._id, null);
              })
              .then(function(result) {
                assert.strictEqual(result.type, descriptor.type);
                assert.strictEqual(result.members, descriptor.members);
                assert.strictEqual(result.admins, descriptor.admins);
                assert.strictEqual(result.linkPath, descriptor.linkPath);
                assert.strictEqual(result.externalId, descriptor.externalId);
              })
              .finally(function() {
                return troupe.remove();
              })
          })
      });
    });

  });

  describe('updateLinksForRepo #slow', function() {
    var fixture = {};

    before(fixtureLoader(fixture, {
      troupe1: {
        securityDescriptor: {
          type: 'GH_REPO',
          members: 'PUBLIC',
          admins: 'GH_REPO_PUSH',
          public: true,
          linkPath: 'gitterHQ/gitter',
          externalId: null,
        }
      }
    }));

    after(function() { fixture.cleanup(); });

    it('should rename links', function() {
      return securityDescriptorService.updateLinksForRepo('gitterHQ/gitter', 'gitterHQ/test')
        .then(function() {
          return securityDescriptorService.getForRoomUser(fixture.troupe1._id, null);
        })
        .then(function(descriptor) {
          assert.deepEqual(descriptor, {
            admins: "GH_REPO_PUSH",
            externalId: null,
            linkPath: "gitterHQ/test",
            members: "PUBLIC",
            public: true,
            type: "GH_REPO"
          });
        });

    });

  });
});
