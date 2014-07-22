/*jslint node:true, unused:true*/
/*global describe:true, it:true, beforeEach */
"use strict";

var testRequire = require('../../test-require');
var assert = require('assert');
var Q = require('q');
var testGenerator = require('../../test-generator');

var mockito = require('jsmockito').JsMockito;

function GitHubOrgServiceMocker() {
  this.member = orgMemberMethodMock;
}

var permissionsModel;
var orgMemberMethodMock;
var URI;
var SECURITY;

beforeEach(function() {
  URI = 'x';
  SECURITY = null;

  orgMemberMethodMock = mockito.mockFunction();

  permissionsModel = testRequire.withProxies("./services/permissions/org-permissions-model", {
    '../github/github-org-service': GitHubOrgServiceMocker,
  });
});

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
}];

describe('org room permissions', function() {
  testGenerator(FIXTURES, function(name, meta) {
    var RIGHT = meta.right;
    var USER = meta.user ? { username: 'gitterbob' } : null;
    var EXPECTED = meta.expectedResult;

    it('should ' + (EXPECTED ? 'allow' : 'deny') + ' ' + RIGHT, function(done) {
      mockito.when(orgMemberMethodMock)().then(function() {
        return Q.resolve(!!meta.org);
      });

      permissionsModel(USER, RIGHT, URI, SECURITY)
        .then(function(result) {
          assert.strictEqual(result, EXPECTED);
        })
        .nodeify(done);
    });
  });
});

