'use strict';

var assert = require('assert');
const mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

var autoRemovalService = require('../lib/auto-removal-service');
var recentRoomService = require('../lib/recent-room-service');
var roomMembershipService = require('../lib/room-membership-service');
var unreadItemsEngine = require('gitter-web-unread-items/lib/engine');
var unreadItemsService = require('gitter-web-unread-items');
var Promise = require('bluebird');
var ObjectID = require('mongodb').ObjectID;
var lazy = require('lazy.js');

describe('auto-removal-service', function() {
  describe('#findRemovalCandidates', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      troupe1: { users: ['user1', 'user2'] }
    });

    it('should return a lurk candidate', function() {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);

      return Promise.join(
        recentRoomService.saveLastVisitedTroupeforUserId(fixture.user1._id, fixture.troupe1.id, {
          lastAccessTime: tenDaysAgo
        }),
        recentRoomService.saveLastVisitedTroupeforUserId(fixture.user2._id, fixture.troupe1.id, {
          lastAccessTime: Date.now()
        }),
        function() {
          return autoRemovalService.findRemovalCandidates(fixture.troupe1.id, { minTimeInDays: 1 });
        }
      ).then(function(candidates) {
        assert.strictEqual(candidates.length, 1);

        assert.equal(candidates[0].userId, fixture.user1._id);
        assert.equal(candidates[0].lastAccessTime.valueOf(), tenDaysAgo.valueOf());
      });
    });
  });

  describe('#bulkRemoveUsersFromRoom', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      group1: {},
      troupe1: { users: ['user1', 'user2'], group: 'group1' },
      troupe2: { users: ['user1', 'user2'], group: 'group1' }
    });

    it('should return a lurk candidate', function() {
      var itemId = new ObjectID();
      var userWithMentions = lazy([
        {
          userId: fixture.user1._id
        },
        {
          userId: fixture.user2._id
        }
      ]);

      return Promise.join(
        recentRoomService.saveLastVisitedTroupeforUserId(fixture.user2._id, fixture.troupe1.id, {
          lastAccessTime: Date.now()
        }),
        unreadItemsEngine.newItemWithMentions(fixture.troupe1.id, itemId, userWithMentions),
        unreadItemsEngine.newItemWithMentions(fixture.troupe2.id, itemId, userWithMentions)
      )
        .then(function() {
          return autoRemovalService.bulkRemoveUsersFromRoom(
            fixture.troupe1.id,
            fixture.troupe1.groupId,
            [fixture.user1._id]
          );
        })
        .then(function() {
          return roomMembershipService.findMembershipForUsersInRoom(fixture.troupe1.id, [
            fixture.user1._id,
            fixture.user2._id
          ]);
        })
        .then(function(membership) {
          assert.strictEqual(membership.length, 1);
          assert(mongoUtils.objectIDsEqual(membership[0], fixture.user2._id));

          return roomMembershipService.findRoomIdsForUser(fixture.user1._id);
        })
        .then(function(roomIds) {
          var rString = roomIds.map(function(f) {
            return String(f);
          });
          assert.deepEqual(rString, [fixture.troupe2.id]);

          return recentRoomService.findInitialRoomUrlForUser(fixture.user1);
        })
        .then(function(url) {
          assert.strictEqual(url, null);
          return unreadItemsService.getAllUnreadItemCounts(fixture.user1._id);
        })
        .then(function(unreadItems) {
          assert.deepEqual(unreadItems, [
            {
              troupeId: fixture.troupe2.id,
              unreadItems: 1,
              mentions: 0
            }
          ]);
        });
    });
  });
});
