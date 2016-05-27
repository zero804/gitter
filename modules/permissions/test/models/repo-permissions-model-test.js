"use strict";

var proxyquireNoCallThru = require("proxyquire").noCallThru();
var assert = require('assert');
var Promise = require('bluebird');
var testGenerator = require('../../../../test/integration/test-generator');
var mockito = require('jsmockito').JsMockito;

var ORG = 'ORG';
var URI = 'ORG/REPO';
var USERNAME = 'gitterbob';

function createMockGitHubRepoService(getRepoMethodMock) {
  function GitHubRepoServiceMocker() {
    this.getRepo = getRepoMethodMock;
  }

  return GitHubRepoServiceMocker;
}

var ALL_RIGHTS = ['create', 'join', 'admin', 'adduser', 'view'];
var ALL_RIGHTS_TESTS = ALL_RIGHTS.map(function(right) {
  return { right: right };
});

// All of our fixtures
var FIXTURES = [{
  name: 'unauthenticated users',
  meta: {
    user: false
  },
  tests: [{
    name: 'in public repos',
    meta: {
      repo: { },
      security: 'PUBLIC'
    },
    tests: [
      { right: 'create', expectedResult: false },
      { right: 'join', expectedResult: false },
      { right: 'admin', expectedResult: false },
      { right: 'adduser', expectedResult: false },
      { right: 'view', expectedResult: true } // Unauthenticated users can view public repos
    ]
  },{
    name: 'in private repos',
    meta: {
      repo: null,
      security: 'PRIVATE',
      expectedResult: false // Unauthenticated users cannot do anything with private repos
    },
    tests: ALL_RIGHTS_TESTS
  }]
},{
  name: 'authenticated',
  meta: {
    user: true
  },
  tests: [{
    name: 'users',
    meta: {},
    tests: [{
      name: 'in public repos',
      meta: {
        security: 'PUBLIC'
      },
      tests: [{
        name: 'with push access',
        meta: {
          repo: { permissions: { push: true } },
          expectedResult: true // Users with push access have full rights
        },
        tests: ALL_RIGHTS_TESTS
      }, {
        name: 'with admin access',
        meta: {
          repo: { permissions: { admin: true } },
          expectedResult: true // Users with push access have full rights
        },
        tests: ALL_RIGHTS_TESTS
      }, {
        name: 'with no permissions',
        meta: {
          repo: { },
        },
        tests: [
          { right: 'create', expectedResult: false },
          { right: 'join', expectedResult: true },
          { right: 'admin', expectedResult: false },
          { right: 'adduser', expectedResult: true },
          { right: 'view', expectedResult: true }
        ]
      }, {
        name: 'with no access',
        meta: {
          repo: null
        },
        tests: [
          { right: 'create', expectedResult: false },
          { right: 'join', expectedResult: false },
          { right: 'admin', expectedResult: false },
          { right: 'adduser', expectedResult: false },
          { right: 'view', expectedResult: true } // Edge case: we know the room is public, allow access
        ]
      }]
    },
    {
      name: 'in private user repos',
      meta: {
        security: 'PRIVATE'
      },
      tests: [{
        name: 'with push access',
        meta: {
          repo: { private: true, permissions: { push: true }, owner: { login: USERNAME, type: 'User' } },
          expectedResult: true // Users with push access have full rights
        },
        tests: [
          { right: 'create', expectedResult: true },
          { right: 'join', expectedResult: true },
          { right: 'admin', expectedResult: true },
          { right: 'adduser', expectedResult: true },
          { right: 'view', expectedResult: true }
        ]
      }, {
        name: 'with no permissions',
        meta: {
          repo: { private: true, owner: { login: USERNAME, type: 'User' } },
          expectedResult: false
        },
        tests: [
          { right: 'create', expectedResult: false },
          { right: 'join', expectedResult: true },
          { right: 'admin', expectedResult: false },
          { right: 'adduser', expectedResult: true },
          { right: 'view', expectedResult: true }
        ]
      }]
    }]
  }]
}, {
  name: 'security has changed to private',
  meta: {
    repo: { private: true, owner: { type: 'Organization', login: ORG } },
    security: 'PUBLIC',
    user: true,
    right: 'join',
    expectedResult: true
  }

}, {
  name: 'security has changed to public',
  meta: {
    repo: { private: false, owner: { type: 'Organization', login: ORG } },
    security: 'PRIVATE',
    user: true,
    right: 'join',
    expectedResult: true
  }
}, {
  name: 'Unexpected owner type',
  meta: {
    repo: { private: true, owner: { type: 'Super Furry Animal', login: ORG } },
    security: 'PRIVATE',
    user: true,
    right: 'create',
    expectedResult: false
  }
},{
  name: 'test github api call failure',
  meta: {
    githubApiCallFailure: true,
    user: true,
  },
  tests: [
    {
      right: 'create',
      security: 'PUBLIC',
      expectedResult: 'throw'
    },
    {
      right: 'admin',
      security: 'PUBLIC',
      expectedResult: false
    },
    {
      right: 'adduser',
      security: 'PUBLIC',
      expectedResult: 'throw'
    },
    {
      name: 'user is in private room',
      meta: {
        userIsInRoom: true,
        security: 'PRIVATE',
        expectedResult: true,
      },
      tests: [{ right: 'view' }, { right: 'join' }]
    },
    {
      name: 'user is not in private room',
      meta: {
        userIsInRoom: false,
        security: 'PRIVATE',
        expectedResult: false,
      },
      tests: [{ right: 'view' }, { right: 'join' }]
    },
    {
      right: 'view',
      expectedResult: true,
      security: 'PUBLIC',
    },
    {
      right: 'join',
      expectedResult: true,
      security: 'PUBLIC'
    }

  ]
}];

describe('repo-permissions', function() {
  testGenerator(FIXTURES, function(name, meta) {

    if(!name) name = 'should be ' + (meta.expectedResult ? 'allowed' : 'denied') + ' ' + meta.right;
    it(name, function(done) {
      var RIGHT = meta.right;
      var USER = meta.user ? { username: USERNAME } : null;
      var EXPECTED = meta.expectedResult;
      var SECURITY = meta.security;
      var GITHUB_API_CALL_FAILURE = !!meta.githubApiCallFailure;
      var USER_IS_IN_ROOM = meta.userIsInRoom;

      // ---------------------------------------------

      var permissionsModel;
      var getRepoMethodMock = mockito.mockFunction();
      var userIsInRoomMock = mockito.mockFunction();

      ORG = 'ORG';
      URI = 'ORG/REPO';
      USERNAME = 'gitterbob';

      permissionsModel = proxyquireNoCallThru("../../lib/models/repo-permissions-model", {
        'gitter-web-github': {
          GitHubRepoService: createMockGitHubRepoService(getRepoMethodMock),
        },
        '../user-in-room': userIsInRoomMock
      });

      mockito.when(userIsInRoomMock)().then(function(uri, user) {
        if(USER_IS_IN_ROOM === true || USER_IS_IN_ROOM === false) {
          return Promise.resolve(USER_IS_IN_ROOM);
        }

        assert(false, 'Unexpected call to userIsInRoom: ' + uri + ', ' + user);
      });

      mockito.when(getRepoMethodMock)().then(function(uri) {
        assert.strictEqual(uri, URI);

        if(GITHUB_API_CALL_FAILURE) {
          var e = new Error('Github is down');
          e.statusCode = 502;
          return Promise.reject(e);
        }

        return Promise.resolve(meta.repo);
      });

      permissionsModel(USER, RIGHT, URI, SECURITY)
        .then(function(result) {
          if(EXPECTED !== 'throw') {
            assert.strictEqual(result, EXPECTED);
          } else {
            assert(false, 'Expected the permission model to throw an exception, instead got ' + result);
          }
        }, function(err) {
          if(EXPECTED !== 'throw') throw err;
          if(meta.expectedErrStatus) {
            assert.strictEqual(err.status, meta.expectedErrStatus);
          }
        })
        .nodeify(done);
    });
  });
});
