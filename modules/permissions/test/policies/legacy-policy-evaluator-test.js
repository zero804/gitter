"use strict";

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var LegacyPolicyEvaluator = require('../../lib/policies/legacy-policy-evaluator');

describe('legacy-policy-evaluator', function() {

  describe('#slow', function() {
    var fixture = {};

    before(fixtureLoader(fixture, {
      user1: {},
      user2: {},
      user3: {},
      troupe1: {
        oneToOne: true,
        users: ['user1', 'user2']
      }
    }));

    after(function() { fixture.cleanup(); });

    function expect(user, room, expected) {
      var evaluator = new LegacyPolicyEvaluator(user._id, null, room._id, null);
      return Promise.props({
          canRead: evaluator.canRead(),
          canWrite: evaluator.canWrite(),
          canJoin: evaluator.canJoin(),
          canAdmin: evaluator.canAdmin(),
          canAddUser: evaluator.canAddUser(),
        })
        .then(function(access) {
          assert.deepEqual(access, expected);

          var evaluator = new LegacyPolicyEvaluator(user._id, user, room._id, room);
          return Promise.props({
              canRead: evaluator.canRead(),
              canWrite: evaluator.canWrite(),
              canJoin: evaluator.canJoin(),
              canAdmin: evaluator.canAdmin(),
              canAddUser: evaluator.canAddUser(),
            });
        })
        .then(function(access) {
          assert.deepEqual(access, expected);
        })
    }

    it('should handle one-to-one rooms for first user in the room', function() {
      return expect(fixture.user1, fixture.troupe1, {
        canRead: true,
        canWrite: true,
        canJoin: true,
        canAdmin: false,
        canAddUser: false
      });
    });

    it('should handle one-to-one rooms for second user in the room', function() {
      return expect(fixture.user2, fixture.troupe1, {
        canRead: true,
        canWrite: true,
        canJoin: true,
        canAdmin: false,
        canAddUser: false
      });
    });

    it('should handle one-to-one rooms for a third user', function() {
      return expect(fixture.user3, fixture.troupe1, {
        canRead: false,
        canWrite: false,
        canJoin: false,
        canAdmin: false,
        canAddUser: false
      });
    });

  });

});
