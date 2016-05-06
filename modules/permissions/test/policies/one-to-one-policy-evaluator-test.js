"use strict";

var assert = require('assert');
var Promise = require('bluebird');
var OneToOneRoomPolicyEvaluator = require('../../lib/policies/one-to-one-policy-evaluator');

describe('one-to-one-policy-evaluator', function() {

  var FIXTURES = [
    { name: 'anon users can access anything', userId: null },
    { name: 'anon users can access anything', userId: '1', inRoom: true },
    { name: 'anon users can access anything', userId: '1', inRoom: false }
  ];

  FIXTURES.forEach(function(meta) {
    it(meta.name, function() {
      var userId = meta.userId;

      var contextDelegate = {
        isMember: Promise.method(function(pUserId) {
          if (userId === null) {
            assert.ok(false, 'Unexpected call');
          }

          assert.strictEqual(pUserId, userId)
          return meta.inRoom;
        })
      };

      var user = userId && {
        _id: userId
      };

      var evaluator = new OneToOneRoomPolicyEvaluator(user, null, contextDelegate);

      return Promise.join(
        evaluator.canRead(),
        evaluator.canWrite(),
        evaluator.canJoin(),
        evaluator.canAdmin(),
        evaluator.canAddUser(),
        function(read, write, join, admin, addUser) {
          if (userId) {
            assert.strictEqual(read, meta.inRoom);
            assert.strictEqual(write, meta.inRoom);
            assert.strictEqual(join, meta.inRoom);
          } else {
            assert.strictEqual(read, false);
            assert.strictEqual(write, false);
            assert.strictEqual(join, false);
          }
          assert.strictEqual(admin, false);
          assert.strictEqual(addUser, false);
        });
    });
  })
});
