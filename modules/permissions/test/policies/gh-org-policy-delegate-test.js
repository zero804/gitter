"use strict";

var assert = require('assert');
var Promise = require('bluebird');
var proxyquireNoCallThru = require("proxyquire").noCallThru();

describe('gh-org-policy-delegate', function() {

  var ORG1_USER = { username: 'x' };
  var NOT_ORG1_USER = { username: 'y' };
  var INVALID_USER = { };
  var ORG1 = 'org1';

  var FIXTURES = [
    { name: 'is org member', org: ORG1, user: ORG1_USER, policy: 'GH_ORG_MEMBER', expectedResult: true },
    { name: 'is not org member', org: ORG1, user: NOT_ORG1_USER, policy: 'GH_ORG_MEMBER', expectedResult: false },
    { name: 'anonymous', org: ORG1, user: null, policy: 'GH_ORG_MEMBER', expectedResult: false },
    { name: 'user sans username', org: ORG1, user: INVALID_USER, policy: 'GH_ORG_MEMBER', expectedResult: false },
    { name: 'invalid policy', org: ORG1, user: INVALID_USER, policy: 'INVALID', expectedResult: false },
  ];

  var GhOrgPolicyDelegate;
  function StubGitHubOrgService(user) {
    this.member = Promise.method(function(uri, username) {
      if (uri === ORG1) {
        if (user === ORG1_USER && username === user.username) {
          return true;
        }
      }

      return false;
    });
  }

  before(function() {
    GhOrgPolicyDelegate = proxyquireNoCallThru('../../lib/policies/gh-org-policy-delegate', {
      'gitter-web-github': {
        GitHubOrgService: StubGitHubOrgService
      }
    });
  });

  FIXTURES.forEach(function(meta) {
    it(meta.name, function() {
      var securityDescriptor = {
        linkPath: meta.org
      }

      var delegate = new GhOrgPolicyDelegate(meta.user, securityDescriptor);

      return delegate.hasPolicy(meta.policy)
        .then(function(result) {
          if(meta.expectedResult === 'throw') {
            assert.ok(false, 'Expected exception');
          }
          assert.strictEqual(result, meta.expectedResult);
        }, function(err) {
          if(meta.expectedResult !== 'throw') {
            throw err
          }
        })
    });
  })
});
