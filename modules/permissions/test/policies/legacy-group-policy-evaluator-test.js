"use strict";

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('../../../../test/integration/test-fixtures');
var proxyquireNoCallThru = require("proxyquire").noCallThru();
var StatusError = require('statuserror');

describe('legacy-group-policy-evaluator', function() {

  describe('#slow', function() {

    function expect(LegacyGroupPolicyEvaluator, user, group, expected) {
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
      var LegacyGroupPolicyEvaluator;
      before(function() {
         LegacyGroupPolicyEvaluator = require('../../lib/policies/legacy-group-policy-evaluator');
      });

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
        return expect(LegacyGroupPolicyEvaluator, fixture.user1, fixture.group1, {
          canRead: true,
          canWrite: true,
          canJoin: true,
          canAdmin: true,
          canAddUser: true
        });
      });

      it('should deal with non-org members ', function() {
        return expect(LegacyGroupPolicyEvaluator, fixture.user2, fixture.group1, {
          canRead: false,
          canWrite: false,
          canJoin: false,
          canAdmin: false,
          canAddUser: false
        });
      });

    });

    describe('legacy user orgs', function() {
      var fixture = fixtureLoader.setup({
        deleteDocuments: {
          Group: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() }],
          User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }]
        },
        user1: {
          username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
          githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
        },
        user2: {},
        user3: {},
        group1: {
          uri: fixtureLoader.GITTER_INTEGRATION_USERNAME,
          type: 'USER'
        }
      });

      it('The owner should always have full access', function() {
        var LegacyGroupPolicyEvaluator = require('../../lib/policies/legacy-group-policy-evaluator');
        return expect(LegacyGroupPolicyEvaluator, fixture.user1, fixture.group1, {
          canRead: true,
          canWrite: true,
          canJoin: true,
          canAdmin: true,
          canAddUser: true
        });
      });

      describe('other users in the org', function() {

        var FIXTURES = [
          { obtainAccessFromGitHubRepo: null, errStatusCode: 500 },
          { obtainAccessFromGitHubRepo: 'repo/repo', access: true, expect: true },
          { obtainAccessFromGitHubRepo: 'repo/repo', access: false, expect: false },
        ];

        FIXTURES.forEach(function(testCase, index) {
          it('non owners should obtain permissions from the repo with #' + index, function() {

            var MockLegacyPolicyEvaluator = function(pUser, pUri, pGithubType) {
              if (testCase.access === undefined) assert.ok(false);

              assert.strictEqual(pUser, user);
              assert.strictEqual(pUri, testCase.obtainAccessFromGitHubRepo);
              assert.strictEqual(pGithubType, 'REPO');

              this.canRead = function() { return testCase.access; };
            };

            var LegacyGroupPolicyEvaluator = proxyquireNoCallThru('../../lib/policies/legacy-group-policy-evaluator', {
              './legacy-github-policy-evaluator': MockLegacyPolicyEvaluator
            });

            var user = fixture.user2;
            var group = fixture.group1;
            var evaluator = new LegacyGroupPolicyEvaluator(user._id, user, group._id, group, testCase.obtainAccessFromGitHubRepo);
            return evaluator.canRead()
              .then(function(result) {
                if (expect === 'throw') {
                  assert.ok(false, 'Expected an exception');
                }

                assert.strictEqual(result, testCase.expect);
              })
              .catch(StatusError, function(err) {
                if (!testCase.errStatusCode) throw err;
                assert.strictEqual(err.status, testCase.errStatusCode);
              })
          });
        });
      });
    });
  });
});
