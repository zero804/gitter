"use strict";

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('../../../../test/integration/test-fixtures');
var LegacyGroupPolicyEvaluator = require('../../lib/policies/legacy-group-policy-evaluator');

describe('legacy-group-policy-evaluator', function() {

  describe('#slow', function() {

    function expect(user, group, expected) {
      var evaluator = new LegacyGroupPolicyEvaluator(user._id, null, group._id, null);
      return Promise.props({
          canRead: evaluator.canRead(),
          canWrite: evaluator.canWrite(),
          canJoin: evaluator.canJoin(),
          canAdmin: evaluator.canAdmin(),
          canAddUser: evaluator.canAddUser(),
        })
        .then(function(access) {
          assert.deepEqual(access, expected);

          var evaluator = new LegacyGroupPolicyEvaluator(user._id, user, group._id, group);
          return Promise.props({
              canRead: evaluator.canRead(),
              canWrite: evaluator.canWrite(),
              canJoin: evaluator.canJoin(),
              canAdmin: evaluator.canAdmin(),
              canAddUser: evaluator.canAddUser(),
            });
        })
        .then(function(access) {
          assert.deepEqual(access, expected);
        })
    }

    describe('legacy group orgs', function() {
      var fixture = fixtureLoader.setup({
        deleteDocuments: {
          Group: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() }],
          User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }]
        },
        user1: {
          username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
          githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
        },
        user2: {},
        user3: {},
        group1: {
          uri: fixtureLoader.GITTER_INTEGRATION_ORG,
          type: 'ORG'
        }
      });

      it('should deal with org members', function() {
        return expect(fixture.user1, fixture.group1, {
          canRead: true,
          canWrite: true,
          canJoin: true,
          canAdmin: true,
          canAddUser: true
        });
      });

      it('should deal with non-org members ', function() {
        return expect(fixture.user2, fixture.group1, {
          canRead: true,
          canWrite: false,
          canJoin: true,
          canAdmin: false,
          canAddUser: false
        });
      });

    });


  });

});
