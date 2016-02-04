/*jslint node:true, unused:true*/
"use strict";

var testRequire = require('../../test-require');
var assert = require('assert');
var _ = require('underscore');
var Promise = require('bluebird');
var testGenerator = require('../../test-generator');
var mockito = require('jsmockito').JsMockito;

var USER = { username: 'gitterbob' };
var URI = 'x/custom';
var PARENT_URI = 'x';

var resolveUserInRoom = function(res) {
  return function(uri, user) {
    assert.equal(uri, URI);
    assert.equal(user, USER);
    return Promise.resolve(res);
  };
};

var resolvePermission = function(res) {
  return function(user, right, repo) {
    assert.equal(repo, PARENT_URI);
    return Promise.resolve(res);
  };
};

var resolvePermissionPull = resolvePermission({permissions: {pull: true}});
var resolvePermissionPush = resolvePermission({permissions: {push: true}});
var resolvePermissionAdmin = resolvePermission({permissions: {admin: true}});

var testPushAndAdmin = function(right) {
  return {
    meta: {right: right},
    tests: [{
      name: 'should allow for repo push members',
      meta: {permission: resolvePermissionPush}
      },{
      name: 'should allow for repo admin members',
      meta: {permission: resolvePermissionAdmin}
    }]
  };
};

var testPullAndNonMember = function(right) {
  return {
    meta: {right: right},
    tests: [{
      name: 'should deny for repo pull members',
      meta: {permission: resolvePermission(false)}
      },{
      name: 'should deny for non repo members',
      meta: {permission: resolvePermission()}
    }]
  };
};

var tests = {
  PUBLIC: {
    join: 'allow',
    adduser: 'allow',
    create: {
      allow: testPushAndAdmin('create'),
      deny: testPullAndNonMember('create')
    },
    admin: {
      allow: testPushAndAdmin('admin'),
      deny: testPullAndNonMember('admin')
    },
  },
  PRIVATE: {
    join: {
      allow: {
        name: 'should allow somebody already in the room to join',
        inRoom: resolveUserInRoom(true),
      },
      deny: {
        name: 'should deny join to somebody not in the room',
        inRoom: resolveUserInRoom(false),
      },
    },
    adduser: {
      allow: {
        name: 'should allow somebody already in the room to add',
        inRoom: resolveUserInRoom(true),
        permission: resolvePermission(true)
      },
      deny: [{
        name: 'should deny repo members not in the room to add',
        inRoom: resolveUserInRoom(false),
        permission: resolvePermission(true)
        },{
        name: 'should deny non repo members add',
        inRoom: resolveUserInRoom(false),
        permission: resolvePermission(false)
      }]
    },
    create: {
      allow: testPushAndAdmin('create'),
      deny: testPullAndNonMember('create')
    },
    admin: {
      allow: testPushAndAdmin('admin'),
      deny: testPullAndNonMember('admin')
    },
  },
  INHERITED: {
    join: {
      allow: {
        name: 'should allow join to repo members',
        permission: resolvePermissionPull
      },
      deny: {
        name: 'should deny non repo members',
        permission: resolvePermission()
      },
    },
    adduser: {
      allow: {
        name: 'should allow repo members to add',
        permission: resolvePermissionPull
      },
      deny: {
        name: 'should deny repo members not in the room to add',
        permission: resolvePermission()
      },
    },
    create: {
      allow: testPushAndAdmin('create'),
      deny: testPullAndNonMember('create')
    },
    admin: {
      allow: testPushAndAdmin('admin'),
      deny: testPullAndNonMember('admin')
    }
  }
};

var makeTest = function(params, expectedResult) {
  var test = _.extend({}, params);
  // meta can be in the Object or the Object itself, add expectedResult accordingly
  if (test.meta) test.meta.expectedResult = expectedResult;
  else test.expectedResult = expectedResult;
  return test;
};

var FIXTURES = _.map(tests, function(rights, security) {
  // First level of the Object are the keys representing the security
  return {
    name: security,
    meta: {
      security: security
    },
    // Extract the tests from the second level, the keys represent the rights to test
    tests: _.map(rights, function(action, right) {
      var res = {
        meta: {
          right: right
        }
      };
      // Accept a String `allow` or `deny` for basic test
      if (_.isString(action)) {
        res.name = 'should '+ action +' '+ right;
        res.meta.expectedResult = action === 'allow';
      }
      // If both `accept` and `deny` have to be tested, create an Object
      else if (_.isObject(action)) {
        res.name = right;
        res.tests = [];
        // Extract the test or Array of tests
        if (action.allow) {
          if (_.isArray(action.allow)) _.each(action.allow, function(test) {
            res.tests.push(makeTest(test, true));
          });
          else res.tests.push(makeTest(action.allow, true));
        }
        if (action.deny) {
          if (_.isArray(action.deny)) _.each(action.deny, function(test) {
            res.tests.push(makeTest(test, false));
          });
          else res.tests.push(makeTest(action.deny, false));
        }
      }
      return res;
    })
  };
});

var userIsInRoomMock = mockito.mockFunction();

var generate = function(name, permsMock, permsModel) {
  describe(name + ' channel permissions', function() {
    testGenerator(FIXTURES, function(name, meta) {
      var RIGHT = meta.right;
      var EXPECTED = meta.expectedResult;
      var SECURITY = meta.security;
      name = name || 'should ' + (EXPECTED ? 'allow' : 'deny') + ' ' + RIGHT;

      it(name, function(done) {
        mockito.when(userIsInRoomMock)().then(meta.inRoom);
        mockito.when(permsMock)().then(meta.permission);

        permsModel(USER, RIGHT, URI, SECURITY)
          .then(function(result) {
            if (EXPECTED) assert(result);
            else assert(!result);
          })
          .nodeify(done);
      });
    });
  });
};

var orgPermissionsMock = mockito.mockFunction();
var orgPermissionsModel = testRequire.withProxies("./services/permissions/org-channel-permissions-model", {
  './org-permissions-model': orgPermissionsMock,
  '../user-in-room': userIsInRoomMock,
});
generate('org', orgPermissionsMock, orgPermissionsModel);

var repoPermissionsMock = mockito.mockFunction();
var repoPermissionsModel = testRequire.withProxies("./services/permissions/repo-channel-permissions-model", {
  './repo-permissions-model': repoPermissionsMock,
  '../user-in-room': userIsInRoomMock,
});
generate('repo', repoPermissionsMock, repoPermissionsModel);
