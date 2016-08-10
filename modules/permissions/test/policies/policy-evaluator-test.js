"use strict";

var assert = require('assert');
var Promise = require('bluebird');
var proxyquireNoCallThru = require("proxyquire").noCallThru();
var PolicyDelegateTransportError = require('../../lib/policies/policy-delegate-transport-error');
var ObjectID = require('mongodb').ObjectID;

function getName(meta, index) {
  if (meta.name) {
    return '#' + index + ' ' + meta.name;
  }

  return Object.keys(meta).reduce(function (memo, key, index) {
    var value = meta[key];
    if (value === undefined) return memo;
    var pair = key + '=' + value;
    if (index) {
      return memo + ',' + pair;
    } else {
      return pair
    }
  }, '#' + index + ' ');
}

var FIXTURES = [{
  name: 'Anonymous user accessing INVITE/MANUAL room',
  anonymous: true,
  inRoom: false,
  membersPolicy: 'PUBLIC',
  adminPolicy: 'MANUAL',
  read: true,
  write: false,
  join: false,
  admin: false,
  addUser: false
}, {
  name: 'Anonymous user accessing INVITE/MANUAL room',
  anonymous: true,
  inRoom: false,
  membersPolicy: 'INVITE',
  adminPolicy: 'MANUAL',
  read: false,
  write: false,
  join: false,
  admin: false,
  addUser: false
}, {
  name: 'Authed user accessing PUBLIC/MANUAL room',
  inRoom: false,
  membersPolicy: 'PUBLIC',
  adminPolicy: 'MANUAL',
  read: true,
  write: true,
  join: true,
  admin: false,
  addUser: true
}, {
  name: 'Authed user accessing PUBLIC/MANUAL room, in extraMembers',
  inRoom: false,
  membersPolicy: 'PUBLIC',
  adminPolicy: 'MANUAL',
  isInExtraMembers: true,
  read: true,
  write: true,
  join: true,
  admin: false,
  addUser: true
}, {
  name: 'Authed user accessing INVITE/MANUAL room, not in room',
  inRoom: false,
  membersPolicy: 'INVITE',
  adminPolicy: 'MANUAL',
  isInExtraMembers: false,
  isInExtraAdmins: false,
  read: false,
  write: false,
  join: false,
  admin: false,
  addUser: false,
  handleReadAccessFailure: true
}, {
  name: 'Authed user accessing INVITE/MANUAL room, not in room',
  inRoom: true,
  membersPolicy: 'INVITE',
  adminPolicy: 'MANUAL',
  isInExtraMembers: false,
  isInExtraAdmins: false,
  read: true,
  write: true,
  join: true,
  admin: false,
  addUser: true
}, {
  name: 'Authed user accessing INVITE/MANUAL room, not in room, in extraMembers',
  inRoom: false,
  membersPolicy: 'INVITE',
  adminPolicy: 'MANUAL',
  isInExtraMembers: true,
  isInExtraAdmins: false,
  read: true,
  write: true,
  join: true,
  admin: false,
  addUser: true
}, {
  name: 'Authed user accessing INVITE/MANUAL room, not in room, in extraMembers',
  inRoom: false,
  membersPolicy: 'INVITE',
  adminPolicy: 'MANUAL',
  isInExtraMembers: true,
  isInExtraAdmins: false,
  read: true,
  write: true,
  join: true,
  admin: false,
  addUser: true
}, {
  name: 'Authed user accessing INVITE/MANUAL room, not in room, in extraAdmins',
  inRoom: false,
  membersPolicy: 'INVITE',
  adminPolicy: 'MANUAL',
  isInExtraMembers: false,
  isInExtraAdmins: true,
  read: true,
  write: true,
  join: true,
  admin: true,
  addUser: true
}, {
  name: 'Authed user accessing X/Y room, not in room, no recent success',
  hasPolicyDelegate: true,
  recentSuccess: false,
  expectRecordSuccessfulCheck: true,
  inRoom: false,
  membersPolicy: 'X',
  adminPolicy: 'Y',
  isInExtraMembers: false,
  isInExtraAdmins: false,
  expectedPolicy1: 'X',
  expectedPolicyResult1: true,
  expectedPolicy2: 'Y',
  expectedPolicyResult2: false,
  read: true,
  write: true,
  join: true,
  admin: false,
  addUser: true
}, {
  name: 'Authed user accessing X/Y room, canRead, not in room, with recent success',
  hasPolicyDelegate: true,
  recentSuccess: true,
  expectRecordSuccessfulCheck: false,
  inRoom: false,
  membersPolicy: 'X',
  adminPolicy: 'Y',
  isInExtraMembers: false,
  isInExtraAdmins: false,
  expectedPolicy1: 'X',
  expectedPolicyResult1: true,
  expectedPolicy2: undefined,
  expectedPolicyResult2: undefined,
  read: true,
}, {
  name: 'Authed user accessing X/Y room, canJoin, not in room, with recent success',
  hasPolicyDelegate: true,
  recentSuccess: true,
  expectRecordSuccessfulCheck: true,
  inRoom: false,
  membersPolicy: 'X',
  adminPolicy: 'Y',
  isInExtraMembers: false,
  isInExtraAdmins: false,
  expectedPolicy1: 'X',
  expectedPolicyResult1: true,
  expectedPolicy2: undefined,
  expectedPolicyResult2: undefined,
  join: true,
}, {
  name: 'Anonymous user accessing X/Y room, with recent success',
  hasPolicyDelegate: true,
  recentSuccess: true,
  expectRecordSuccessfulCheck: false,
  anonymous: true,
  membersPolicy: 'X',
  adminPolicy: 'Y',
  isInExtraMembers: false,
  isInExtraAdmins: false,
  expectedPolicy1: undefined,
  expectedPolicyResult1: undefined,
  expectedPolicy2: undefined,
  expectedPolicyResult2: undefined,
  read: true,
  write: false,
  join: false,
  admin: false,
  addUser: false
}, {
  name: 'Anonymous user accessing X/Y room, without recent success',
  hasPolicyDelegate: true,
  recentSuccess: false,
  expectRecordSuccessfulCheck: false,
  anonymous: true,
  membersPolicy: 'X',
  adminPolicy: 'Y',
  isInExtraMembers: false,
  isInExtraAdmins: false,
  expectedPolicy1: 'X',
  expectedPolicyResult1: false,
  expectedPolicy2: undefined,
  expectedPolicyResult2: undefined,
  read: false,
  write: false,
  join: false,
  admin: false,
  addUser: false
}, {
  name: 'Anonymous user accessing X/Y room, without recent success',
  hasPolicyDelegate: true,
  recentSuccess: false,
  expectRecordSuccessfulCheck: true,
  anonymous: true,
  membersPolicy: 'X',
  adminPolicy: 'Y',
  isInExtraMembers: false,
  isInExtraAdmins: false,
  expectedPolicy1: 'X',
  expectedPolicyResult1: true,
  expectedPolicy2: undefined,
  expectedPolicyResult2: undefined,
  read: true
}, {
  name: 'Anonymous user accessing X/Y public room, without recent success and with backend fail',
  hasPolicyDelegate: true,
  recentSuccess: false,
  expectRecordSuccessfulCheck: false,
  anonymous: true,
  membersPolicy: 'X',
  adminPolicy: 'Y',
  expectedPolicy1: 'X',
  expectedPolicyResult1: 'throw',
  public: true,
  read: true
}, {
  name: 'Anonymous user accessing X/Y non-public room, without recent success and with backend fail',
  hasPolicyDelegate: true,
  recentSuccess: false,
  expectRecordSuccessfulCheck: false,
  anonymous: true,
  membersPolicy: 'X',
  adminPolicy: 'Y',
  expectedPolicy1: 'X',
  expectedPolicyResult1: 'throw',
  public: false,
  read: false
}, {
  name: 'Authed user accessing X/Y public room, without recent success and with backend fail',
  hasPolicyDelegate: true,
  recentSuccess: false,
  expectRecordSuccessfulCheck: false,
  membersPolicy: 'X',
  adminPolicy: 'Y',
  expectedPolicy1: 'X',
  expectedPolicyResult1: 'throw',
  expectedPolicy2: 'Y',
  expectedPolicyResult2: 'throw',
  public: true,
  read: true,
  inRoom: false,
}, {
  name: 'Authed user accessing X/Y public room, without recent success and with backend fail',
  hasPolicyDelegate: true,
  recentSuccess: false,
  expectRecordSuccessfulCheck: false,
  membersPolicy: 'X',
  adminPolicy: 'Y',
  expectedPolicy1: 'X',
  expectedPolicyResult1: 'throw',
  expectedPolicy2: 'Y',
  expectedPolicyResult2: 'throw',
  public: false,
  read: false,
  handleReadAccessFailure: true
}, {
  name: 'Authed user accessing X/Y room, without policy delegate',
  hasPolicyDelegate: false,
  membersPolicy: 'X',
  adminPolicy: 'Y',
  read: false,
  handleReadAccessFailure: true
}, {
  name: 'Authed user in private room, backend failed without recent success, should not be removed from room',
  hasPolicyDelegate: true,
  recentSuccess: false,
  expectRecordSuccessfulCheck: false,
  membersPolicy: 'X',
  adminPolicy: 'Y',
  expectedPolicy1: 'X',
  expectedPolicyResult1: 'throw',
  expectedPolicy2: 'Y',
  expectedPolicyResult2: 'throw',
  public: false,
  read: true,
  handleReadAccessFailure: false,
  didRemoveUserFromRoom: false,
  inRoom: true
}, {
  name: 'Authed user in private room, access denied, should be removed from room',
  hasPolicyDelegate: true,
  recentSuccess: false,
  expectRecordSuccessfulCheck: false,
  membersPolicy: 'X',
  adminPolicy: 'Y',
  expectedPolicy1: 'X',
  expectedPolicyResult1: false,
  expectedPolicy2: 'Y',
  expectedPolicyResult2: false,
  public: false,
  read: false,
  handleReadAccessFailure: true,
  removeUserFromRoom: true,
  inRoom: true
}, {
  name: 'An org admin cannot access an INVITE only room',
  inRoom: false,
  membersPolicy: 'INVITE',
  adminPolicy: 'X',
  hasPolicyDelegate: true,
  isInExtraMembers: false,
  isInExtraAdmins: false,
  expectedPolicy1: 'X',
  expectedPolicyResult1: true,
  read: false,
  write: false,
  join: false,
  admin: false,
  addUser: false,
  handleReadAccessFailure: true,
}, {
  name: 'An org admin in an INVITE only room is an admin of the room',
  inRoom: true,
  hasPolicyDelegate: true,
  recentSuccess: false,
  expectRecordSuccessfulCheck: true,
  membersPolicy: 'INVITE',
  adminPolicy: 'X',
  isInExtraMembers: false,
  isInExtraAdmins: false,
  expectedPolicy1: 'X',
  expectedPolicyResult1: true,
  read: true,
  write: true,
  join: true,
  admin: true,
  addUser: true
}, {
  name: 'An non-org-admin in an INVITE only room is not an admin of the room',
  inRoom: true,
  hasPolicyDelegate: true,
  recentSuccess: false,
  membersPolicy: 'INVITE',
  adminPolicy: 'X',
  isInExtraMembers: false,
  isInExtraAdmins: false,
  expectedPolicy1: 'X',
  expectedPolicyResult1: false,
  read: true,
  write: true,
  join: true,
  admin: false,
  addUser: true
}];

describe('policy-evaluator', function () {

  // All the attributes:
  // name: String,
  // hasPolicyDelegate: true,
  // recentSuccess: true,
  // expectRecordSuccessfulCheck: false,
  // inRoom: false,
  // membersPolicy: undefined,
  // adminPolicy: undefined,
  // isInExtraMembers: false,
  // isInExtraAdmins: false,
  // expectedPolicy1: undefined,
  // expectedPolicyResult1: undefined,
  // expectedPolicy2: undefined,
  // expectedPolicyResult2: undefined,
  // read: true,
  // write: true,
  // join: true,
  // admin: false,
  // addUser: true
  FIXTURES.forEach(function (meta, index) {
    var name = getName(meta, index);
    it(name, function () {

      var stubRateLimiter = {
        checkForRecentSuccess: Promise.method(function () {
          if (meta.recentSuccess === true || meta.recentSuccess === false) {
            return meta.recentSuccess;
          }
          assert.ok(false, 'Unexpected call to checkForRecentSuccess');
        }),
        recordSuccessfulCheck: Promise.method(function () {
          this.recordSuccessfulCheckCount++;
          if (!meta.expectRecordSuccessfulCheck) {
            assert.ok(false, 'Unexpected call to recordSuccessfulCheck')
          }
        }),
        recordSuccessfulCheckCount: 0
      }

      var didCallHandleReadAccessFailure = 0;
      var didRemoveUserFromRoom = false;

      var PolicyEvaluator = proxyquireNoCallThru('../../lib/policies/policy-evaluator', {
        './policy-check-rate-limiter': stubRateLimiter
      });

      var userId = meta.anonymous ? null : new ObjectID(1);

      var contextDelegate;

      // Only real users have a context delegate
      if (userId) {
        contextDelegate = {
          isMember: Promise.method(function() {
            return meta.inRoom;
          }),

          handleReadAccessFailure: Promise.method(function() {
            assert(meta.handleReadAccessFailure, 'Unexpected call to handleReadAccessFailure');
            didCallHandleReadAccessFailure++;
            if (meta.inRoom) {
              didRemoveUserFromRoom = true;
            }
          })
        };
      }

      var securityDescriptor = {
        members: meta.membersPolicy,
        admins: meta.adminPolicy,
        public: meta.public
      }

      if (meta.isInExtraMembers) {
        assert(userId, 'Fixture broken');
        securityDescriptor.extraMembers = [userId];
      }

      if (meta.isInExtraAdmins) {
        assert(userId, 'Fixture broken');
        securityDescriptor.extraAdmins = [userId];
      }

      var policyDelegate;
      if (meta.hasPolicyDelegate) {
        policyDelegate = {
          hasPolicy: Promise.method(function (policyName) {
            assert(policyName);

            if (meta.expectedPolicy1 === policyName) {
              if (meta.expectedPolicyResult1 === 'throw') {
                throw new PolicyDelegateTransportError();
              }
              return meta.expectedPolicyResult1;
            }

            if (meta.expectedPolicy2 === policyName) {
              if (meta.expectedPolicyResult2 === 'throw') {
                throw new PolicyDelegateTransportError();
              }

              return meta.expectedPolicyResult2;
            }

            assert.ok(false, 'Unexpected policy: ' + policyName);
          }),

          getPolicyRateLimitKey: function () {
            return 'XXX';
          }
        }
      }

      var evaluator = new PolicyEvaluator(userId, securityDescriptor, policyDelegate, contextDelegate);

      return Promise.all([
          meta.read !== undefined && evaluator.canRead(),
          meta.write !== undefined && evaluator.canWrite(),
          meta.join !== undefined && evaluator.canJoin(),
          meta.admin !== undefined && evaluator.canAdmin(),
          meta.addUser !== undefined && evaluator.canAddUser(),
        ])
        .spread(function (read, write, join, admin, addUser) {
          var expected = {};
          var results = {};
          if(meta.read !== undefined) {
            expected.read = meta.read;
            results.read = read;
          }
          if(meta.write !== undefined) {
            expected.write = meta.write;
            results.write = write;
          }
          if(meta.join !== undefined) {
            expected.join = meta.join;
            results.join = join;
          }
          if(meta.admin !== undefined) {
            expected.admin = meta.admin;
            results.admin = admin;
          }
          if(meta.addUser !== undefined) {
            expected.addUser = meta.addUser;
            results.addUser = addUser;
          }

          assert.deepEqual(results, expected);

          if (meta.expectRecordSuccessfulCheck) {
            assert(stubRateLimiter.recordSuccessfulCheckCount > 0);
          }

          if (meta.handleReadAccessFailure) {
            assert(didCallHandleReadAccessFailure > 0);
          }

          assert.strictEqual(didRemoveUserFromRoom, !!meta.removeUserFromRoom);
        });
    });
  })
});
