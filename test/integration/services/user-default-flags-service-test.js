"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('../test-fixtures');

describe('user-default-flags', function() {

  describe('#slow', function() {
    var fixture = {};

    var userDefaultFlagsService = testRequire('./services/user-default-flags-service');
    var roomMembershipFlags = testRequire('./services/room-membership-flags');

    before(fixtureLoader(fixture, {
      user1: { },
      user2: { }
    }));

    after(function() {
      return fixture.cleanup();
    });

    describe('getDefaultFlagsForUserId', function() {
      it('should handle users without a default', function() {
        var userId1 = fixture.user1._id;

        return userDefaultFlagsService.setDefaultFlagsForUserId(userId1, null)
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserId(userId1);
          })
          .then(function(flags) {
            assert.strictEqual(flags, roomMembershipFlags.DEFAULT_USER_FLAGS);
          });
      });

      it('should handle users with a value', function() {
        var userId1 = fixture.user1._id;

        return userDefaultFlagsService.setDefaultFlagsForUserId(userId1, 1)
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserId(userId1);
          })
          .then(function(flags) {
            assert.strictEqual(flags, 1);
          });
      });

    });

    describe('getDefaultFlagsForUserIds', function() {
      it('should handle users without a default', function() {
        var userId1 = fixture.user1._id;
        var userId2 = fixture.user2._id;

        return Promise.join(
            userDefaultFlagsService.setDefaultFlagsForUserId(userId1, null),
            userDefaultFlagsService.setDefaultFlagsForUserId(userId2, null))
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserIds([userId1, userId2]);
          })
          .then(function(flags) {
            var expected = [];
            expected[userId1] = roomMembershipFlags.DEFAULT_USER_FLAGS;
            expected[userId2] = roomMembershipFlags.DEFAULT_USER_FLAGS;
            assert.deepEqual(flags, expected);
          });
      });

      it('should handle users with a value', function() {
        var userId1 = fixture.user1._id;
        var userId2 = fixture.user2._id;

        return Promise.join(
            userDefaultFlagsService.setDefaultFlagsForUserId(userId1, 1),
            userDefaultFlagsService.setDefaultFlagsForUserId(userId2, 2))
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserIds([userId1, userId2]);
          })
          .then(function(flags) {
            var expected = [];
            expected[userId1] = 1;
            expected[userId2] = 2;
            assert.deepEqual(flags, expected);
          });
      });
    });



    describe('setDefaultFlagsForUserId', function() {
      it('should handle setting and unsetting the value', function() {
        var userId1 = fixture.user1._id;

        return userDefaultFlagsService.setDefaultFlagsForUserId(userId1, null)
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserId(userId1);
          })
          .then(function(flags) {
            assert.strictEqual(flags, roomMembershipFlags.DEFAULT_USER_FLAGS);
            return userDefaultFlagsService.setDefaultFlagsForUserId(userId1, 1)
          })
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserId(userId1);
          })
          .then(function(flags) {
            assert.strictEqual(flags, 1);
            return userDefaultFlagsService.setDefaultFlagsForUserId(userId1, 2)
          })
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserId(userId1);
          })
          .then(function(flags) {
            assert.strictEqual(flags, 2);
            return userDefaultFlagsService.setDefaultFlagsForUserId(userId1, null)
          })
          .then(function() {
            return userDefaultFlagsService.getDefaultFlagsForUserId(userId1);
          })
          .then(function(flags) {
            assert.strictEqual(flags, roomMembershipFlags.DEFAULT_USER_FLAGS);
            return userDefaultFlagsService.setDefaultFlagsForUserId(userId1, 1)
          })
      });

    });
  });

});
