"use strict";

var assert = require('assert');
var Promise = require('bluebird');
var proxyquireNoCallThru = require("proxyquire").noCallThru();

describe('gh-repo-policy-delegate', function() {

  var REPO1_PUSH_USER = { _id: '1', username: 'x' };
  var NOT_REPO1_PUSH_USER = { _id: '2', username: 'y' };
  var NO_ACCESS_REPO1_USER = { _id: '3', username: 'y' };
  var REPO1 = 'repo1';

  var FIXTURES = [
    { name: 'is repo push member, for repo access ', repo: REPO1, user: REPO1_PUSH_USER, policy: 'GH_REPO_ACCESS', expectedResult: true },
    { name: 'is repo push member, for push access ', repo: REPO1, user: REPO1_PUSH_USER, policy: 'GH_REPO_PUSH', expectedResult: true },

    { name: 'is repo no-push member, for repo access ', repo: REPO1, user: NOT_REPO1_PUSH_USER, policy: 'GH_REPO_ACCESS', expectedResult: true },
    { name: 'is repo no-push member, for push access ', repo: REPO1, user: NOT_REPO1_PUSH_USER, policy: 'GH_REPO_PUSH', expectedResult: false },

    { name: 'has no access to repo, for repo access', repo: REPO1, user: NO_ACCESS_REPO1_USER, policy: 'GH_REPO_ACCESS', expectedResult: false },
    { name: 'has no access to repo, for repo access', repo: REPO1, user: NO_ACCESS_REPO1_USER, policy: 'GH_REPO_PUSH', expectedResult: false },

    { name: 'invalid policy', repo: REPO1, user: REPO1_PUSH_USER, policy: 'INVALID', expectedResult: false },
  ];

  var GhRepoPolicyDelegate;
  function StubGitHubRepoService(user) {
    this.getRepo = Promise.method(function(uri) {
      if (uri === REPO1) {
        if (user === REPO1_PUSH_USER) {
          return {
            permissions: {
              push: true,
              admin: false
            }
          };
        }

        if (user === NOT_REPO1_PUSH_USER) {
          return {
            permissions: {
              push: false,
              admin: false,
            }
          };
        }

        if (user === NO_ACCESS_REPO1_USER) {
          return null;
        }
      }

      return null;
    });
  }

  before(function() {
    GhRepoPolicyDelegate = proxyquireNoCallThru('../../lib/policies/gh-repo-policy-delegate', {
      'gitter-web-github': {
        GitHubRepoService: StubGitHubRepoService
      }
    });
  });

  FIXTURES.forEach(function(meta) {
    it(meta.name, function() {
      var securityDescriptor = {
        linkPath: meta.repo
      }


      var user = meta.user;
      var userId = user && user._id;

      function userLoader() {
        return Promise.resolve(user);
      }

      var delegate = new GhRepoPolicyDelegate(userId, userLoader, securityDescriptor);

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
