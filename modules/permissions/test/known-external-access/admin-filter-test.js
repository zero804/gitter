'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('admin-filter-test', function() {

  describe('integration tests #slow', function() {
    var URI = fixtureLoader.generateUri();
    var adminFilter = require('../../lib/known-external-access/admin-filter');
    var recorder = require('../../lib/known-external-access/recorder');

    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      user3: {},
      group1: {
        securityDescriptor: {
          type: 'GH_ORG',
          members: 'PUBLIC',
          admins: 'GH_ORG_MEMBER',
          public: true,
          linkPath: URI,
          externalId: 'external3',
          extraAdmins: ['user1']
        }
      },
      group2: {
        securityDescriptor: {
          type: null,
          members: 'PUBLIC',
          admins: 'MANUAL',
          public: true,
          extraAdmins: ['user2']
        }
      },

    });

    it('should return extra admin results', function() {
      return adminFilter(fixture.group1, [fixture.user1.id, fixture.user2._id])
        .then(function(filtered) {
          assert.deepEqual(filtered.map(String), [fixture.user1.id]);
        })
    });

    it('should return known positive values', function() {
      var userId1 = fixture.user1._id;
      var userId2 = fixture.user2._id;
      var userId3 = fixture.user3._id;

      return recorder.testOnly.handle(userId2, 'GH_ORG', 'GH_ORG_MEMBER', URI, 'external3', true)
        .then(function() {
          return adminFilter(fixture.group1, [userId1, userId2, userId3]);
        })
        .then(function(filtered) {
          assert.deepEqual(filtered.map(String), [userId1, userId2].map(String));
        });
    });

    it('should not return known negative values', function() {
      var userId1 = fixture.user1._id;
      var userId2 = fixture.user2._id;
      var userId3 = fixture.user3._id;

      // Positive first
      return recorder.testOnly.handle(userId2, 'GH_ORG', 'GH_ORG_MEMBER', URI, 'external3', true)
        .then(function() {
          // Negative
          return recorder.testOnly.handle(userId2, 'GH_ORG', 'GH_ORG_MEMBER', URI, 'external3', false);
        })
        .delay(100) // Give mongo time to write to secondary...
        .then(function() {
          return adminFilter(fixture.group1, [userId1, userId2, userId3]);
        })
        .then(function(filtered) {
          assert.deepEqual(filtered.map(String), [userId1].map(String));
        });
    });

    it('should work with non-backed security descriptors', function() {
      var userId1 = fixture.user1._id;
      var userId2 = fixture.user2._id;
      var userId3 = fixture.user3._id;

      return adminFilter(fixture.group2, [userId1, userId2, userId3])
        .then(function(filtered) {
          assert.deepEqual(filtered.map(String), [userId2].map(String));
        })

    })

  });

});
