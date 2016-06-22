'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var proxyquireNoCallThru = require("proxyquire").noCallThru();

describe('gh-org-policy-delegate-with-repo-fallback', function() {

  var FIXTURES = [
    {
      name: 'should validate for org members',
      policyName: 'GH_ORG_MEMBER',
      delegateResult: true,
      expected: true,
      expectedDelegateHasPolicyCount: 1,
      expectedRepoDelegateCount: 0,
      org: 'x',
      repo: 'x/y'
    },
    {
      name: 'should fallthrough when the user is not an org member',
      policyName: 'GH_ORG_MEMBER',
      delegateResult: false,
      repoDelegateResult: true,
      expected: true,
      expectedDelegateHasPolicyCount: 1,
      expectedRepoDelegateCount: 1,
      org: 'x',
      repo: 'x/y'
    },
    {
      name: 'should fallthrough when the user is not an org member or a repo member',
      policyName: 'GH_ORG_MEMBER',
      delegateResult: false,
      repoDelegateResult: false,
      expected: false,
      expectedDelegateHasPolicyCount: 1,
      expectedRepoDelegateCount: 1,
      org: 'x',
      repo: 'x/y'
    },
    {
      name: 'should not fallthrough when the repo does not match the org',
      policyName: 'GH_ORG_MEMBER',
      delegateResult: false,
      repoDelegateResult: false,
      expected: false,
      expectedDelegateHasPolicyCount: 1,
      expectedRepoDelegateCount: 0,
      org: 'x',
      repo: 'NOT_X/y'
    },
    {
      name: 'should not fallthrough for anonymous',
      policyName: 'GH_ORG_MEMBER',
      anon: true,
      delegateResult: false,
      repoDelegateResult: false,
      expected: false,
      expectedDelegateHasPolicyCount: 1,
      expectedRepoDelegateCount: 0,
      org: 'x',
      repo: 'x/y'
    },
    {
      name: 'should not fallthrough for other policies',
      policyName: 'SOMETHING_ODD',
      anon: true,
      delegateResult: false,
      repoDelegateResult: false,
      expected: false,
      expectedDelegateHasPolicyCount: 1,
      expectedRepoDelegateCount: 0,
      org: 'x',
      repo: 'x/y'
    }
  ];

  FIXTURES.forEach(function(META) {

    it(META.name, function() {
      var delegateHasPolicyCount = 0;
      var repoDelegateCount = 0;
      var StubGithubOrgPolicyDelegate = function() {
        this.hasPolicy = function(policyName) {
          assert.ok(META.expectedDelegateHasPolicyCount, 'Unexpected call');
          delegateHasPolicyCount++;
          assert.strictEqual(policyName, META.policyName);
          return Promise.resolve(META.delegateResult);
        }
      }

      var StubLegacyGithubPolicyDelegate = function() {
        this.canAdmin = function() {
          assert.ok(META.expectedRepoDelegateCount, 'Unexpected call');
          repoDelegateCount++;
          return Promise.resolve(META.repoDelegateResult);
        }
      }

      var GhOrgPolicyDelegateWithRepoFallback = proxyquireNoCallThru('../../lib/policies/gh-org-policy-delegate-with-repo-fallback', {
        './gh-org-policy-delegate': StubGithubOrgPolicyDelegate,
        './legacy-github-policy-evaluator': StubLegacyGithubPolicyDelegate
      });

      var userId = META.anon ? null : '1';
      var user = META.anon ? null : { };
      var securityDescriptor = {
        type: 'GH_ORG',
        linkPath: META.org
      };

      var fallbackRepo = META.repo;

      var userLoader = function() {
        return Promise.resolve(user);
      };

      var policyDelegate = new GhOrgPolicyDelegateWithRepoFallback(userId, userLoader, securityDescriptor, fallbackRepo);
      return policyDelegate.hasPolicy(META.policyName)
        .then(function(result) {
          assert.strictEqual(result, META.expected);
        })
        .then(function() {
          assert.strictEqual(delegateHasPolicyCount, META.expectedDelegateHasPolicyCount);
          assert.strictEqual(repoDelegateCount, META.expectedRepoDelegateCount);
        })
    });
  });

});
