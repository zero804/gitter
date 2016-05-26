"use strict";

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var proxyquireNoCallThru = require("proxyquire").noCallThru();
var StatusError = require('statuserror');

describe('legacy-group-policy-evaluator', function() {

  describe('#slow', function() {

    function expect(LegacyGroupPolicyEvaluator, user, type, uri, githubId, expected) {
      var evaluator = new LegacyGroupPolicyEvaluator(user._id, null, type, uri, githubId, null);
      return Promise.props({
          canRead: evaluator.canRead(),
          canWrite: evaluator.canWrite(),
          canJoin: evaluator.canJoin(),
          canAdmin: evaluator.canAdmin(),
          canAddUser: evaluator.canAddUser(),
        })
        .then(function(access) {
          assert.deepEqual(access, expected);

          var evaluator = new LegacyGroupPolicyEvaluator(user._id, user, type, uri, githubId);
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
          User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }]
        },
        user1: {
          username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
          githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
        },
        user2: {},
        user3: {},
        // group1: {
        //   uri: fixtureLoader.GITTER_INTEGRATION_ORG,
        //   type: 'ORG'
        // }
      });

      it('should deal with org members', function() {
        var type = 'ORG';
        var uri = fixtureLoader.GITTER_INTEGRATION_ORG;
        var githubId = null;
        return expect(LegacyGroupPolicyEvaluator, fixture.user1, type, uri, githubId, {
          canRead: true,
          canWrite: true,
          canJoin: true,
          canAdmin: true,
          canAddUser: true
        });
      });

      it('should deal with non-org members ', function() {
        var type = 'ORG';
        var uri = fixtureLoader.GITTER_INTEGRATION_ORG;
        var githubId = null;

        return expect(LegacyGroupPolicyEvaluator, fixture.user2, type, uri, githubId, {
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
          User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }]
        },
        user1: {
          username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
          githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
        },
        user2: {},
        user3: {},
        // group1: {
        //   uri: fixtureLoader.GITTER_INTEGRATION_USERNAME,
        //   type: 'USER'
        // }
      });

      it('The owner should always have full access', function() {
        var LegacyGroupPolicyEvaluator = require('../../lib/policies/legacy-group-policy-evaluator');
        var uri = fixtureLoader.GITTER_INTEGRATION_USERNAME;
        var type = 'USER';
        var githubId = null;

        return expect(LegacyGroupPolicyEvaluator, fixture.user1, type, uri, githubId, {
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
            var uri = fixtureLoader.GITTER_INTEGRATION_USERNAME;
            var type = 'USER';
            var githubId = null;

            var evaluator = new LegacyGroupPolicyEvaluator(user._id, user, type, uri, githubId, testCase.obtainAccessFromGitHubRepo);
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
