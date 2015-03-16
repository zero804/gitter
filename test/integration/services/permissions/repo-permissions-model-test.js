"use strict";

var testRequire = require('../../test-require');
var assert = require('assert');
var Q = require('q');
var testGenerator = require('../../test-generator');
var mockito = require('jsmockito').JsMockito;
var StatusError = require('statuserror');

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
      { right: 'create',  expectedResult: false },
      { right: 'join',    expectedResult: false },
      { right: 'admin',   expectedResult: false },
      { right: 'adduser', expectedResult: false },
      { right: 'view',    expectedResult: true  } // Unauthenticated users can view public repos
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
    name: 'free users',
    meta: {
      premiumUser: false
    },
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
          { right: 'create',  expectedResult: false },
          { right: 'join',    expectedResult: true  },
          { right: 'admin',   expectedResult: false },
          { right: 'adduser', expectedResult: true  },
          { right: 'view',    expectedResult: true  }
        ]
      }, {
        name: 'with no access',
        meta: {
          repo: null
        },
        tests: [
          { right: 'create',  expectedResult: false },
          { right: 'join',    expectedResult: false },
          { right: 'admin',   expectedResult: false },
          { right: 'adduser', expectedResult: false },
          { right: 'view',    expectedResult: true  } // Edge case: we know the room is public, allow access
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
          { right: 'create',  expectedResult: 'throw', expectedErrStatus: 402 },
          { right: 'join',    expectedResult: 'throw', expectedErrStatus: 402 },
          { right: 'admin',   expectedResult: true },
          { right: 'adduser', expectedResult: true },
          { right: 'view',    expectedResult: 'throw', expectedErrStatus: 402 }
        ]
      }, {
        name: 'with no permissions',
        meta: {
          repo: { private: true, owner: { login: USERNAME, type: 'User' }  },
          expectedResult: false
        },
        tests: [
          { right: 'create',  expectedResult: false },
          { right: 'join',    expectedResult: 'throw', expectedErrStatus: 402},
          { right: 'admin',   expectedResult: false },
          { right: 'adduser', expectedResult: true },
          { right: 'view',    expectedResult: 'throw', expectedErrStatus: 402}
        ]
      }]
    }]
  }, {
    name: 'premium users',
    meta: {
      premiumUser: true
    },
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
        name: 'with no access',
        meta: {
          repo: { },
        },
        tests: [
          { right: 'create',  expectedResult: false },
          { right: 'join',    expectedResult: true  },
          { right: 'admin',   expectedResult: false },
          { right: 'adduser', expectedResult: true  },
          { right: 'view',    expectedResult: true  }
        ]
      }]
    },{
      name: 'in premium orgs',
      meta: {
        premiumOrg: true
      },
      tests: [{
        name: 'in private repos',
        meta: {
          security: 'PRIVATE'
        },
        tests: [{
          name: 'with push access',
          meta: {
            repo: { private: true, permissions: { push: true }, owner: { login: ORG, type: 'Organization' } },
            expectedResult: true // Users with push access have full rights
          },
          tests: ALL_RIGHTS_TESTS
        }, {
          name: 'with admin access',
          meta: {
            repo: { private: true, permissions: { admin: true }, owner: { login: ORG, type: 'Organization' } },
            expectedResult: true // Users with push access have full rights
          },
          tests: ALL_RIGHTS_TESTS
        }, {
          name: 'with no access',
          meta: {
            repo: { private: true, owner: { type: 'Organization', login: ORG } },
          },
          tests: [
            { right: 'create',  expectedResult: false },
            { right: 'join',    expectedResult: true  },
            { right: 'admin',   expectedResult: false },
            { right: 'adduser', expectedResult: true  },
            { right: 'view',    expectedResult: true  }
          ]
        }]
      }]
    },{
      name: 'in free orgs',
      meta: {
        premiumOrg: false
      },
      tests: [
        {
        name: 'in private repos',
        meta: {
          security: 'PRIVATE'
        },
        tests: [{
          name: 'with push access',
          meta: {
            repo: { private: true, permissions: { push: true }, owner: { login: ORG, type: 'Organization' } },
          },
          tests: [
            { right: 'create',  expectedResult: 'throw', expectedErrStatus: 402  }, // Cannot create a private room in a free org
            { right: 'join',    expectedResult: 'throw', expectedErrStatus: 402  },
            { right: 'admin',   expectedResult: true  },
            { right: 'adduser', expectedResult: true  },
            { right: 'view',    expectedResult: 'throw', expectedErrStatus: 402  }
          ]
        }, {
          name: 'with no permissions',
          meta: {
            repo: { private: true, owner: { type: 'Organization', login: ORG } },
          },
          tests: [
            { right: 'create',  expectedResult: false },
            { right: 'join',    expectedResult: 'throw', expectedErrStatus: 402  },
            { right: 'admin',   expectedResult: false },
            { right: 'adduser', expectedResult: true  },
            { right: 'view',    expectedResult: 'throw', expectedErrStatus: 402  },
          ]
        }]
      }


      ]
    }]
  }]
}, {
  name: 'security has changed to private',
  meta: {
    repo: { private: true, owner: { type: 'Organization', login: ORG } },
    security: 'PUBLIC',
    user: true,
    premiumOrg: false,
    premiumUser: false,
    right: 'join',
    expectedResult: 'throw',
    expectedErrStatus: 402
  }

}, {
  name: 'security has changed to public',
  meta: {
    repo: { private: false, owner: { type: 'Organization', login: ORG } },
    security: 'PRIVATE',
    user: true,
    premiumOrg: false,
    premiumUser: false,
    right: 'join',
    expectedResult: true
  }
}, {
  name: 'Unexpected owner type',
  meta: {
    repo: { private: true, owner: { type: 'Super Furry Animal', login: ORG } },
    security: 'PRIVATE',
    user: true,
    premiumOrg: false,
    premiumUser: false,
    right: 'create',
    expectedResult: false
  }
},{
  name: 'test github api call failure',
  meta: {
    premiumOrg: false,
    premiumUser: false,
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

      permissionsModel = testRequire.withProxies("./services/permissions/repo-permissions-model", {
        '../github/github-repo-service': createMockGitHubRepoService(getRepoMethodMock),
        '../user-in-room': userIsInRoomMock
      });

      mockito.when(userIsInRoomMock)().then(function(uri, user) {
        if(USER_IS_IN_ROOM === true || USER_IS_IN_ROOM === false) {
          return Q.resolve(USER_IS_IN_ROOM);
        }

        assert(false, 'Unexpected call to userIsInRoom: ' + uri + ', ' + user);
      });

      mockito.when(getRepoMethodMock)().then(function(uri) {
        assert.strictEqual(uri, URI);

        if(GITHUB_API_CALL_FAILURE) {
          var e = new Error('Github is down');
          e.statusCode = 502;
          return Q.reject(e);
        }

        return Q.resolve(meta.repo);
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
