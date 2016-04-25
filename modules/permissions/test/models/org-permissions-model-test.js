"use strict";

var proxyquireNoCallThru = require("proxyquire").noCallThru();
var assert = require('assert');
var Promise = require('bluebird');
var testGenerator = require('../../../../test/integration/test-generator');

var mockito = require('jsmockito').JsMockito;

function GitHubOrgServiceMocker() {
  this.member = orgMemberMethodMock;
}

var permissionsModel;
var orgMemberMethodMock;
var userIsInRoomMock;
var URI;
var SECURITY;



var ALL_RIGHTS = ['create', 'join', 'admin', 'adduser', 'view'];
var ALL_RIGHTS_TESTS = ALL_RIGHTS.map(function(right) {
  return {
    meta: {
      right: right
    }
  };
});

// All of our fixtures
var FIXTURES = [{
  name: 'Authenticated users',
  meta: {
    user: true,
    org: false,
    expectedResult: false
  },
  tests: ALL_RIGHTS_TESTS
},{
  name: 'Unauthenticated users',
  meta: {
    user: false,
    expectedResult: false
  },
  tests: ALL_RIGHTS_TESTS
}, {
  name: 'Github API failure',
  meta: {
    user: true,
    githubApiCallFailure: true
  },
  tests: [{
    name: 'user is in room',
    meta: {
      expectedResult: true,
      userIsInRoom: true
    },
    tests: ALL_RIGHTS_TESTS
  }, {
    name: 'user is not in room',
    meta: {
      expectedResult: 'throw',
      userIsInRoom: false
    },
    tests: ALL_RIGHTS_TESTS
  }]
}];

describe('org room permissions', function() {
  beforeEach(function() {
    URI = 'x';
    SECURITY = null;

    orgMemberMethodMock = mockito.mockFunction();
    userIsInRoomMock = mockito.mockFunction();

    permissionsModel = proxyquireNoCallThru("../../lib/models/org-permissions-model", {
      'gitter-web-github': {
        GitHubOrgService: GitHubOrgServiceMocker,
      },
      '../user-in-room': userIsInRoomMock
    });
  });

  testGenerator(FIXTURES, function(name, meta) {
    var RIGHT = meta.right;
    var USER = meta.user ? { username: 'gitterbob' } : null;
    var EXPECTED = meta.expectedResult;
    var GITHUB_API_CALL_FAILURE = meta.githubApiCallFailure;
    var USER_IS_IN_ROOM = meta.userIsInRoom;

    it('should ' + (EXPECTED ? 'allow' : 'deny') + ' ' + RIGHT, function(done) {
      mockito.when(userIsInRoomMock)()
        .then(function(uri, user) {

          if(USER_IS_IN_ROOM === true || USER_IS_IN_ROOM === false) {
            return Promise.resolve(USER_IS_IN_ROOM);
          }

          assert(false, 'Unexpected call to userIsInRoom: ' + uri + ', ' + user);
        });

      mockito.when(orgMemberMethodMock)().then(function() {
        if(GITHUB_API_CALL_FAILURE) {
          var e = new Error('Github is down');
          e.statusCode = 502;
          return Promise.reject(e);
        }

        return Promise.resolve(!!meta.org);
      });

      permissionsModel(USER, RIGHT, URI, SECURITY)
        .then(function(result) {
          if(EXPECTED === 'throw') {
            assert(false, 'Expected permissions model to throw an error');
          }

          assert.strictEqual(result, EXPECTED);
        })
        .catch(function(err) {
          if(EXPECTED !== 'throw') {
            throw err;
          }

          // Expected a throw. All is good.
        })
        .nodeify(done);
    });
  });
});
