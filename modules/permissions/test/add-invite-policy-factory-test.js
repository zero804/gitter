'use strict';

var proxyquireNoCallThru = require("proxyquire").noCallThru();
var Promise = require('bluebird');
var assert = require('assert');

describe('add-invite-policy-factory', function() {
  describe('createPolicyForRoomAdd', function() {

    var FIXTURES = [{
      name: 'should allow any user to be added to private unbacked rooms',
      delegateResponse: false,
      expectedCanJoin: true,
      sd: {
        type: null,
        members: 'INVITE'
      }
    }, {
      name: 'should allow any user to be added to public unbacked rooms',
      delegateResponse: false,
      expectedCanJoin: true,
      sd: {
        type: null,
        members: 'PUBLIC'
      }
    }, {
      name: 'should allow a user to be added to github-backed rooms when they have access',
      delegateResponse: true,
      expectedCanJoin: true,
      sd: {
        type: 'GH_REPO',
        members: 'ANYTHING'
      }
    }, {
      name: 'should not allow a user to be added to github-backed rooms when they do not have access',
      delegateResponse: false,
      expectedCanJoin: false,
      sd: {
        type: 'GH_REPO',
        members: 'ANYTHING'
      }
    }];

    FIXTURES.forEach(function(META) {
      it(META.name, function() {
        var user = { _id: '1', id: '1' };
        var room = { _id: '2', id: '2' };

        var addInvitePolicyFactory = proxyquireNoCallThru('../lib/add-invite-policy-factory', {
          './policies/gh-repo-policy-delegate': function() {
            this.hasPolicy = function() {
              return Promise.resolve(META.delegateResponse);
            };
            this.getPolicyRateLimitKey = function() {
              return null;
            };
          },
          './policies/gh-org-policy-delegate': function() {},
          './policies/gh-user-policy-delegate': function() {},
          './security-descriptor-service': {
            getForRoomUser: function() {
              return Promise.resolve(META.sd);
            }
          }
        });

        return addInvitePolicyFactory.createPolicyForRoomAdd(user, room)
          .then(function(policy) {
            return policy.canJoin();
          })
          .then(function(result) {
            assert.strictEqual(result, META.expectedCanJoin);
          })
      });
    })

  });

});
