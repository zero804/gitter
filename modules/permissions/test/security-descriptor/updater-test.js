"use strict";

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var securityDescriptorUpdater = require('../../lib/security-descriptor/updater');
var securityDescriptorService = require('../../lib/security-descriptor');

describe('security-descriptor-updater', function() {

  describe('updateLinksForRepo #slow', function() {
    var fixture = {};
    fixtureLoader.disableMongoTableScans();

    before(fixtureLoader(fixture, {
      troupe1: {
        securityDescriptor: {
          type: 'GH_REPO',
          members: 'PUBLIC',
          admins: 'GH_REPO_PUSH',
          public: true,
          linkPath: 'gitterHQ/gitter',
          externalId: null,
          internalId: null,
        }
      }
    }));

    after(function() { fixture.cleanup(); });

    it('should rename links', function() {
      return securityDescriptorUpdater.updateLinksForRepo('gitterHQ/gitter', 'gitterHQ/test')
        .then(function() {
          return securityDescriptorService.room.findById(fixture.troupe1._id, null);
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
