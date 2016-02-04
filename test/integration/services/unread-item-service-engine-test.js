"use strict";

var testRequire = require('../test-require');
var Promise = require('bluebird');
var assert = require('assert');
var mongoUtils = testRequire('./utils/mongo-utils');
var _ = require('lodash');


describe('unread-item-service', function() {

  var blockTimer = require('../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  // Allow redis to connect properly
  before(function(done) {
    setTimeout(done, 1000);
  });

  after(function(done) {
    if (process.env.DISABLE_EMAIL_NOTIFY_CLEAR_AFTER_TEST) return done();

    var unreadItemServiceEngine = testRequire('./services/unread-item-service-engine');
    unreadItemServiceEngine.testOnly.removeAllEmailNotifications()
      .nodeify(done);
  });

  describe('single test cases', function() {

    var unreadItemServiceEngine, troupeId1, itemId1, itemId2, itemId3, userId1, userId2, userIds, troupeId2;

    beforeEach(function() {
      unreadItemServiceEngine = testRequire('./services/unread-item-service-engine');
      troupeId1 = mongoUtils.getNewObjectIdString();
      troupeId2 = mongoUtils.getNewObjectIdString();
      userId1 = mongoUtils.getNewObjectIdString();
      userId2 = mongoUtils.getNewObjectIdString();
      itemId1 = mongoUtils.getNewObjectIdString();
      itemId2 = mongoUtils.getNewObjectIdString();
      itemId3 = mongoUtils.getNewObjectIdString();
      userIds = [userId1, userId2];
    });


    describe('LastChatTimestamps', function() {

      it('should save the last chat in redis', function(done) {
        var ts = mongoUtils.getTimestampFromObjectId(itemId1);
        return unreadItemServiceEngine.testOnly.setLastChatTimestamp(troupeId1, ts)
          .then(function() {
            return Promise.fromCallback(function(callback) {
              unreadItemServiceEngine.testOnly.redisClient.get('lmts:' + troupeId1, callback);
            });
          })
          .then(function(storedTs) {
            assert.deepEqual(ts, storedTs);
          })
          .nodeify(done);
      });

      it('should fetch last msg timestamps for the given troupeIds', function(done) {
        return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, [])
          .then(function() {
            return unreadItemServiceEngine.getLastChatTimestamps([troupeId1]);
          })
          .then(function(timestamps) {
            var expected = mongoUtils.getTimestampFromObjectId(itemId1);
            assert.deepEqual(timestamps, [expected]);
          })
          .nodeify(done);
      });

      it('should return an empty set if troupeIds are missing', function(done) {
        return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, [])
          .then(function() {
            return unreadItemServiceEngine.getLastChatTimestamps([]);
          })
          .then(function(timestamps) {
            assert.deepEqual(timestamps, []);
          })
          .nodeify(done);
      });

    });

    describe('newItemWithMentions', function() {

      it('should add items without mentions', function(done) {
        /* Add an item */
        unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, [])
          .then(function(result) {
            var expected = {};
            expected[userId1] = { unreadCount: 1, badgeUpdate: true };
            expected[userId2] = { unreadCount: 1, badgeUpdate: true };
            assert.deepEqual(result, expected);

            /* Add a duplicate item */
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, []);
          })
          .then(function(result) {
            var expected = {};
            expected[userId1] = { unreadCount: undefined, badgeUpdate: false };
            expected[userId2] = { unreadCount: undefined, badgeUpdate: false };
            assert.deepEqual(result, expected);

          })
          .nodeify(done);
      });

      it('should add items with mentions', function(done) {
        /* Add an item */
        unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, [userId1])
          .then(function(result) {
            var expected = {};
            expected[userId1] = { unreadCount: 1, badgeUpdate: true, mentionCount: 1 };
            expected[userId2] = { unreadCount: 1, badgeUpdate: true };
            assert.deepEqual(result, expected);

            /* Add a duplicate item */
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, [userId1]);
          })
          .then(function(result) {
            var expected = {};
            expected[userId1] = { unreadCount: undefined, badgeUpdate: false, mentionCount: undefined };
            expected[userId2] = { unreadCount: undefined, badgeUpdate: false };
            assert.deepEqual(result, expected);

          })
          .nodeify(done);
      });

    });

    describe('removeItem', function() {
      it('should remove items', function(done) {
        unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, [])
          .then(function() {
            return unreadItemServiceEngine.removeItem(troupeId1, itemId1, userIds);
          })
          .then(function(results) {
            assert.strictEqual(results.length, 2);
            userIds.forEach(function(userId, index) {
              var result = results[index];
              assert.strictEqual(result.userId, userId);
              assert.strictEqual(result.unreadCount, 0);
              assert.strictEqual(result.mentionCount, undefined);
              assert.strictEqual(result.badgeUpdate, true);
            });

            return unreadItemServiceEngine.removeItem(troupeId1, itemId1, userIds);
          })
          .then(function(results) {
            assert.strictEqual(results.length, 2);
            userIds.forEach(function(userId, index) {
              var result = results[index];
              assert.strictEqual(result.userId, userId);
              assert.strictEqual(result.unreadCount, undefined);
              assert.strictEqual(result.mentionCount, undefined);
              assert.strictEqual(result.badgeUpdate, false);
            });
          })
          .nodeify(done);
      });

      it('should remove mentions', function(done) {
        unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, [userId1])
          .then(function() {
            return unreadItemServiceEngine.removeItem(troupeId1, itemId1, userIds);
          })
          .then(function(results) {
            assert.deepEqual(results, [{
              userId: userId1,
              unreadCount: 0,
              mentionCount: 0,
              badgeUpdate: true
            }, {
              userId: userId2,
              unreadCount: 0,
              mentionCount: undefined,
              badgeUpdate: true
            }]);

            return unreadItemServiceEngine.removeItem(troupeId1, itemId1, userIds);
          })
          .then(function(results) {
            assert.strictEqual(results.length, 2);
            userIds.forEach(function(userId, index) {
              var result = results[index];
              assert.strictEqual(result.userId, userId);
              assert.strictEqual(result.unreadCount, undefined);
              assert.strictEqual(result.mentionCount, undefined);
              assert.strictEqual(result.badgeUpdate, false);
            });
          })
          .nodeify(done);
      });
    });


    describe('ensureAllItemsRead', function() {

      it('should remove items', function(done) {
        unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, [])
          .then(function() {
            return unreadItemServiceEngine.ensureAllItemsRead(userId1, troupeId1);
          })
          .then(function(result) {
            assert.strictEqual(result.unreadCount, 0);
            assert.strictEqual(result.badgeUpdate, true);

            return unreadItemServiceEngine.ensureAllItemsRead(troupeId1, userId1);
          })
          .then(function(result) {
            assert.strictEqual(result.unreadCount, 0);
            assert.strictEqual(result.badgeUpdate, false);
          })
          .nodeify(done);
      });

    });


    describe('markItemsRead', function() {
      it('should mark things as read', function(done) {
        unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, [])
          .then(function() {
            return unreadItemServiceEngine.markItemsRead(userId1, troupeId1, [itemId1]);
          })
          .then(function(result) {
            assert.strictEqual(result.unreadCount, 0);
            assert.strictEqual(result.badgeUpdate, true);

            return unreadItemServiceEngine.markItemsRead(userId1, troupeId1, [itemId1]);
          })
          .then(function(result) {
            assert.strictEqual(result.unreadCount, 0);
            assert.strictEqual(result.badgeUpdate, false);
          })
          .nodeify(done);
      });

      it('should create new mentions for users', function(done) {
        unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, [userId1], [userId1])
          .then(function() {
            return unreadItemServiceEngine.markItemsRead(userId1, troupeId1, [itemId1], [itemId1]);
          })
          .then(function(result) {
            assert.deepEqual(result, {
              unreadCount: 0,
              mentionCount: 0,
              badgeUpdate: true
            });

            return unreadItemServiceEngine.markItemsRead(userId1, troupeId1, [itemId1], [itemId1]);
          })
          .then(function(result) {
            assert.deepEqual(result, {
              unreadCount: 0,
              mentionCount: 0,
              badgeUpdate: false
            });

          })
          .nodeify(done);
      });

      it('should handle some unread mentions for users', function(done) {
        Promise.all([
          unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, [userId1], [userId1]),
          unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId2, [userId1], [userId1])
          ])
          .then(function() {
            return unreadItemServiceEngine.markItemsRead(userId1, troupeId1, [itemId1], [itemId1]);
          })
          .then(function(result) {
            assert.deepEqual(result, {
              unreadCount: 1,
              mentionCount: 1,
              badgeUpdate: false
            });

            return unreadItemServiceEngine.markItemsRead(userId1, troupeId1, [itemId2], [itemId2]);
          })
          .then(function(result) {
            assert.deepEqual(result, {
              unreadCount: 0,
              mentionCount: 0,
              badgeUpdate: true
            });

          })
          .nodeify(done);
      });
    });


    describe('listTroupeUsersForEmailNotifications', function() {
      before(function(done) {
        var unreadItemServiceEngine = testRequire('./services/unread-item-service-engine');
        unreadItemServiceEngine.testOnly.removeAllEmailNotifications()
          .nodeify(done);
      });

      it('should list users for email notifications #slow', function(done) {
        unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, [])
          .then(function() {
            return unreadItemServiceEngine.listTroupeUsersForEmailNotifications(Date.now(), 1);
          })
          .then(function(results) {
            var u = results[userId1];
            assert(u);
            var t = u[troupeId1];
            assert(t);
            assert.strictEqual(t.length, 1);
            assert.equal(t[0], itemId1);

            return unreadItemServiceEngine.listTroupeUsersForEmailNotifications(Date.now(), 1);
          })
          .then(function(results) {
            var u = results[userId1];
            assert(!u);
          })
          .nodeify(done);
      });



      describe('emailnotifications', function() {
        it('should let you know who needs to be notified by email', function(done) {
          this.timeout(10000);

          return Promise.all([
              unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, [userId1], []),
              unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId2, [userId1], []),
              unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId3, [userId1], []),
            ])
            .then(function() {
              return unreadItemServiceEngine.listTroupeUsersForEmailNotifications(Date.now() + 10, 5);
            })
            .then(function(results) {
              assert(results[userId1]);
              assert(results[userId1][troupeId1]);
              assert.equal(results[userId1][troupeId1].length, 3);
              assert(results[userId1][troupeId1].indexOf('' + itemId1) >= 0);
              assert(results[userId1][troupeId1].indexOf('' + itemId2) >= 0);
              assert(results[userId1][troupeId1].indexOf('' + itemId3) >= 0);
            })
            .nodeify(done);
        });

        it('should not find someone who has been notified', function(done) {
          return Promise.all([
              unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, [userId1], []),
              unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId2, [userId1], []),
              unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId3, [userId1], []),
            ])
            .then(function() {
              return unreadItemServiceEngine.listTroupeUsersForEmailNotifications(Date.now(), 5);
            })
            .then(function() {
              return unreadItemServiceEngine.listTroupeUsersForEmailNotifications(Date.now(), 5);
            })
            .then(function(results) {
              assert(!results[userId1]);
            })
            .nodeify(done);
        });

        it('should not notify someone who has read their messages', function(done) {
          return Promise.all([
              unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, [userId1], []),
              unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId2, [userId1], []),
              unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId3, [userId1], []),
            ])
            .then(function() {
              return unreadItemServiceEngine.markItemsRead(userId1, troupeId1, [itemId1, itemId2, itemId3]);
            })
            .then(function() {
              return unreadItemServiceEngine.listTroupeUsersForEmailNotifications(Date.now(), 5);
            })
            .then(function(results) {
              assert(!results[userId1]);
            })
            .nodeify(done);
        });


        it('should not find messages newer than the cutoff', function(done) {
          blockTimer.reset();
          return Promise.all([
              unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, [userId1], []),
              unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId2, [userId1], []),
              unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId3, [userId1], []),
            ])
            .then(function() {
              blockTimer.reset();
              return unreadItemServiceEngine.listTroupeUsersForEmailNotifications(Date.now() - 86400000, 5);
            })
            .then(function(results) {
              assert(!results[userId1]);
            })
            .nodeify(done);
        });


        it('should not email somebody until the email timeout period has expired #slow', function(done) {
          return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, [userId1], [])
            .then(function() {
              return unreadItemServiceEngine.listTroupeUsersForEmailNotifications(Date.now(), 1);
            })
            .then(function(results) {
              assert(results[userId1]);
            })
            .then(function() {
              return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId2, [userId1], []);
            })
            .then(function() {
              return unreadItemServiceEngine.listTroupeUsersForEmailNotifications(Date.now(), 1);
            })
            .then(function(results) {
              assert(!results[userId1]);
            })
            .then(function() {
              return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId3, [userId1], []);
            })
            .delay(1100)
            .then(function() {
              return unreadItemServiceEngine.listTroupeUsersForEmailNotifications(Date.now(), 1);
            })
            .then(function(results) {
              assert(results[userId1]);
              assert(results[userId1][troupeId1]);
              assert.equal(results[userId1][troupeId1].length, 3);
            })
            .nodeify(done);
        });

        it('should not email somebody twice if no new messages have arrived #slow', function(done) {
          return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, [userId1], [])
            .then(function() {
              return unreadItemServiceEngine.listTroupeUsersForEmailNotifications(Date.now(), 1);
            })
            .then(function(results) {
              assert(results[userId1]);
              assert(results[userId1][troupeId1]);
            })
            .delay(1100)
            .then(function() {
              return unreadItemServiceEngine.listTroupeUsersForEmailNotifications(Date.now(), 1);
            })
            .then(function(results) {
              assert(!results[userId1]);
            })
            .nodeify(done);
        });

        it('should batch up emails for a user #slow', function(done) {
          return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, [userId1], [])
            .delay(500)
            .then(function() {
              return unreadItemServiceEngine.newItemWithMentions(troupeId2, itemId2, [userId1], []);
            })
            .then(function() {
              return unreadItemServiceEngine.listTroupeUsersForEmailNotifications(Date.now(), 600);
            })
            .then(function(results) {
              assert(results[userId1]);
              assert(results[userId1][troupeId1]);
              assert(results[userId1][troupeId2]);
            })
            .delay(100)
            .then(function() {
              return unreadItemServiceEngine.listTroupeUsersForEmailNotifications(Date.now(), 1);
            })
            .then(function(results) {
              assert(!results[userId1]);
            })
            .nodeify(done);
        });

      });

    });

    describe('getUserUnreadCountsForRooms', function() {

      it('should return user unread counts', function(done) {
        unreadItemServiceEngine.getUserUnreadCountsForRooms(userId1, [troupeId1])
          .then(function(result) {
            assert.strictEqual(result[troupeId1].unreadItems, 0);
            assert.strictEqual(result[troupeId1].mentions, 0);
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, []);
          })
          .then(function() {
            return unreadItemServiceEngine.getUserUnreadCountsForRooms(userId1, [troupeId1]);
          })
          .then(function(result) {
            assert.strictEqual(result[troupeId1].unreadItems, 1);
            assert.strictEqual(result[troupeId1].mentions, 0);
          })
          .nodeify(done);
      });

    });


    describe('getUserUnreadCountsForRooms', function() {

      it('should return user unread counts', function(done) {
        unreadItemServiceEngine.getUserUnreadCountsForRooms(userId1, [troupeId1])
          .then(function(result) {
            assert.strictEqual(result[troupeId1].unreadItems, 0);
            assert.strictEqual(result[troupeId1].mentions, 0);
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, [userId1], [userId1]);
          })
          .then(function() {
            return unreadItemServiceEngine.getUserUnreadCountsForRooms(userId1, [troupeId1]);
          })
          .then(function(result) {
            assert.strictEqual(result[troupeId1].unreadItems, 1);
            assert.strictEqual(result[troupeId1].mentions, 1);
          })
          .nodeify(done);
      });

    });


    describe('getUnreadItems', function() {

      it('should return unread items', function(done) {
        unreadItemServiceEngine.getUnreadItems(userId1, troupeId1)
          .then(function(result) {
            assert.strictEqual(result.length, 0);
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, []);
          })
          .then(function() {
            return unreadItemServiceEngine.getUnreadItems(userId1, troupeId1);
          })
          .then(function(result) {
            assert.strictEqual(result.length, 1);
            assert.equal(result[0], itemId1);
          })
          .nodeify(done);
      });
    });

    describe('getUnreadItemsAndMentions', function() {

      it('should return unread items when use has mentions and unread items', function(done) {
        unreadItemServiceEngine.getUnreadItemsAndMentions(userId1, troupeId1)
          .spread(function(unreadItems, mentions) {
            assert.strictEqual(unreadItems.length, 0);
            assert.strictEqual(mentions.length, 0);
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, userIds);
          })
          .then(function() {
            return unreadItemServiceEngine.getUnreadItemsAndMentions(userId1, troupeId1);
          })
          .spread(function(unreadItems, mentions) {
            assert.strictEqual(unreadItems.length, 1);
            assert.strictEqual(mentions.length, 1);
            assert.equal(unreadItems[0], itemId1);
            assert.equal(mentions[0], itemId1);
          })
          .nodeify(done);
      });

      it('should return unread items when use has no mentions and unread items', function(done) {
        unreadItemServiceEngine.getUnreadItemsAndMentions(userId1, troupeId1)
          .spread(function(unreadItems, mentions) {
            assert.strictEqual(unreadItems.length, 0);
            assert.strictEqual(mentions.length, 0);
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, []);
          })
          .then(function() {
            return unreadItemServiceEngine.getUnreadItemsAndMentions(userId1, troupeId1);
          })
          .spread(function(unreadItems, mentions) {
            assert.strictEqual(unreadItems.length, 1);
            assert.strictEqual(mentions.length, 0);
            assert.equal(unreadItems[0], itemId1);
          })
          .nodeify(done);
      });
    });


    describe('getUnreadItemsForUserTroupes', function() {
      it('should return unread items', function(done) {
        unreadItemServiceEngine.getUnreadItemsForUserTroupes([{ userId: userId1, troupeId: troupeId1 }])
          .then(function(result) {
            assert.strictEqual(result[userId1 + ":" + troupeId1].length, 0);
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, []);
          })
          .then(function() {
            return unreadItemServiceEngine.getUnreadItemsForUserTroupes([{ userId: userId1, troupeId: troupeId1 }]);
          })
          .then(function(result) {
            assert.strictEqual(result[userId1 + ":" + troupeId1].length, 1);
            assert.equal(result[userId1 + ":" + troupeId1][0], itemId1);
          })
          .nodeify(done);

      });
    });


    describe('getAllUnreadItemCounts', function() {
      it('should return unread items', function(done) {
        unreadItemServiceEngine.getAllUnreadItemCounts(userId1)
          .then(function(result) {
            assert.strictEqual(result.length, 0);
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, []);
          })
          .then(function() {
            return unreadItemServiceEngine.getAllUnreadItemCounts(userId1);
          })
          .then(function(result) {
            assert(result.length, 1);
            var r1 = result[0];
            assert.equal(r1.troupeId, troupeId1);
            assert.strictEqual(r1.unreadItems, 1);
            assert.strictEqual(r1.mentions, 0);

            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, [userId1], [userId1]);
          })
          .then(function() {
            return unreadItemServiceEngine.getAllUnreadItemCounts(userId1);
          })
          .then(function(result) {
            assert(result.length, 1);
            var r1 = result[0];
            assert.equal(r1.troupeId, troupeId1);
            assert.strictEqual(r1.unreadItems, 1);
            assert.strictEqual(r1.mentions, 1);
          })
          .nodeify(done);
      });
    });


    describe('getRoomsMentioningUser', function() {
      it('should return rooms mentioning a user', function(done) {
        unreadItemServiceEngine.getRoomsMentioningUser(userId1)
          .then(function(result) {
            assert.strictEqual(result.length, 0);
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, [userId1], [userId1]);
          })
          .then(function() {
            return unreadItemServiceEngine.getRoomsMentioningUser(userId1);
          })
          .then(function(result) {
            assert(result.length, 1);
            assert(result[0], troupeId1);
          })
          .nodeify(done);
      });
    });


    describe('getBadgeCountsForUserIds', function() {
      it('should return badge counts for the given users', function(done) {
        unreadItemServiceEngine.getBadgeCountsForUserIds([userId1])
          .then(function(result) {
            assert.strictEqual(result[userId1], 0);
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, []);
          })
          .then(function() {
            return unreadItemServiceEngine.getBadgeCountsForUserIds([userId1]);
          })
          .then(function(result) {
            assert.strictEqual(result[userId1], 1);
          })
          .nodeify(done);
      });
    });

    describe('removeMentionForUser', function() {
      it('should create new mentions for users', function(done) {
        unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, [userId1], [userId1])
          .then(function() {
            return unreadItemServiceEngine.markItemsRead(userId1, troupeId1, [itemId1], [itemId1]);
          })
          .then(function(result) {
            assert.deepEqual(result, {
              unreadCount: 0,
              mentionCount: 0,
              badgeUpdate: true
            });

            return unreadItemServiceEngine.markItemsRead(userId1, troupeId1, [itemId1], [itemId1]);
          })
          .then(function(result) {
            assert.deepEqual(result, {
              unreadCount: 0,
              mentionCount: 0,
              badgeUpdate: false
            });

          })
          .nodeify(done);
      });

    });


    describe('getRoomsCausingBadgeCount', function() {
      it('should return a list of rooms with unread items', function(done) {
        unreadItemServiceEngine.getRoomsCausingBadgeCount(userId1)
          .then(function(results) {
            assert.strictEqual(results.length, 0);
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, []);
          })
          .then(function() {
            return unreadItemServiceEngine.getRoomsCausingBadgeCount(userId1);
          })
          .then(function(results) {
            assert.strictEqual(results.length, 1);
            assert.equal(results[0], troupeId1);
          })
          .nodeify(done);
      });
    });


    describe('limits', function() {

      it('should not allow a user to have more than 100 unread items in a room', function(done) {
        var adds = [];
        var addItemIds = [];
        var startTimestamp = Math.floor(Date.now() / 1000) * 1000 - 86400000; // Yesterday
        for(var i = 0; i < 110; i++) {
          var itemId = mongoUtils.createIdForTimestampString(startTimestamp);
          startTimestamp = startTimestamp + 1000; // Make sure that each timestamp is a unique second
          addItemIds.push("" + itemId);
          adds.push(unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId, [userId1], []));
        }

        blockTimer.reset();
        return Promise.all(adds)
          .then(function() {
            blockTimer.reset();

            var itemId = mongoUtils.createIdForTimestampString(startTimestamp);
            startTimestamp = startTimestamp + 1000; // Make sure that each timestamp is a unique second

            addItemIds.push("" + itemId);

            // Do a single insert sans contention. In the real world, there will never be this much
            // contention for a single usertroupe
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId, [userId1], []);
          })
          .delay(100)
          .then(function() {
            return unreadItemServiceEngine.getUserUnreadCountsForRooms(userId1, [troupeId1]);
          })
          .then(function(counts) {
            assert.equal(counts[troupeId1].unreadItems, 100);
            assert.equal(counts[troupeId1].mentions, 0);

            // Additionally, during the unread item inserts above, the lua
            // script would have upgraded the SET to a ZSET. This requires that
            // the lua script parse the ObjectIDs into timestamps to use as score
            // values. The application does not have access to these values
            // but they are important as they dictate the order in which
            // unread items are dropped off the bottom of the collection.
            // As an additional sanity check to ensure that the lua script is
            // doing it's job, we pull the items with the scores and
            // confirm that they're correct

            return Promise.fromCallback(function(callback) {
              unreadItemServiceEngine.testOnly.redisClient.zrange('unread:chat:' + userId1 + ':' + troupeId1, 0, -1, 'WITHSCORES', callback);
            });

          })
          .then(function(unreadItemsWithScores) {
            // Ensure that the timestamp upgrade works correctly
            var itemIds = [];
            for(var i = 0; i < unreadItemsWithScores.length; i = i + 2) {
              var itemId = unreadItemsWithScores[i];
              var timestamp = parseInt(unreadItemsWithScores[i + 1], 10);

              assert.strictEqual(timestamp, mongoUtils.getTimestampFromObjectId(itemId));
              itemIds.push(itemId);
            }

            var last100 = addItemIds.slice(-100);
            assert.deepEqual(last100, itemIds);
          })
          .nodeify(done);
      });

    });
  });

  describe('unread-batches', function() {
    var unreadItemServiceEngine;
    var batchSize;
    beforeEach(function() {
      unreadItemServiceEngine = testRequire('./services/unread-item-service-engine');
      batchSize = unreadItemServiceEngine.testOnly.UNREAD_BATCH_SIZE;
    });

    it('should batch a single batch with no mentions', function() {
      var batch = unreadItemServiceEngine.testOnly.getNewItemBatches(['a', 'b', 'c'], []);
      assert.deepEqual([ { userIds: ['a', 'b', 'c'], mentionUserIds: [] }], batch);
    });

    it('should batch a single batch with some mentions', function() {
      var batch = unreadItemServiceEngine.testOnly.getNewItemBatches(['a', 'b', 'c'], ['a']);
      assert.deepEqual([ { userIds: ['a', 'b', 'c'], mentionUserIds: ['a'] }], batch);
    });


    it('should handle large batches', function() {
      var TOTAL = 900;

      var userIds = [];
      var mentionUserIds = [];
      for(var i = 0; i < TOTAL; i++) {
        userIds.push(i);
        if(i % 3 === 0) {
          mentionUserIds.push(i);
        }
      }
      var expectedNumberOfBatches = Math.floor(TOTAL / batchSize) + (TOTAL % batchSize === 0 ? 0 : 1);
      var batches = unreadItemServiceEngine.testOnly.getNewItemBatches(userIds, mentionUserIds);
      assert.strictEqual(expectedNumberOfBatches, batches.length);
      for(var j = 0; j < expectedNumberOfBatches; j++) {
        var expectedUsers = [];
        var expectedMentions = [];
        for(var k = 0; k < batchSize; k++) {
          var id  = j * batchSize + k;

          expectedUsers.push(id);
          if(id % 3 === 0) {
            expectedMentions.push(id);
          }
        }
        assert.deepEqual(expectedUsers, batches[j].userIds);
        assert.deepEqual(expectedMentions, batches[j].mentionUserIds);
      }
      });

    it('should handle large batches #2', function() {
      var TOTAL = 905;
      var userIds = [];
      var mentionUserIds = [];
      for(var i = 0; i < 905; i++) {
        userIds.push(i);
        if(i % 3 === 0) {
          mentionUserIds.push(i);
        }
      }

      var expectedNumberOfBatches = Math.floor(TOTAL / batchSize) + (TOTAL % batchSize === 0 ? 0 : 1);
      var batches = unreadItemServiceEngine.testOnly.getNewItemBatches(userIds, mentionUserIds);
      assert.strictEqual(expectedNumberOfBatches, batches.length);
      for(var j = 0; j < expectedNumberOfBatches; j++) {
        var expectedUsers = [];
        var expectedMentions = [];
        for(var k = 0; k < batchSize; k++) {
          var id  = j * batchSize + k;

          if(id >= TOTAL) break;

          expectedUsers.push(id);
          if(id % 3 === 0) {
            expectedMentions.push(id);
          }
        }
        assert.deepEqual(expectedUsers, batches[j].userIds);
        assert.deepEqual(expectedMentions, batches[j].mentionUserIds);
      }
    });



  });

  describe('integration tests', function() {
    var unreadItemServiceEngine, troupeId1, troupeId2, troupeId3,
    userId1, userId2, itemId1, itemId2, itemId3, userIds;

    beforeEach(function() {
      unreadItemServiceEngine = testRequire('./services/unread-item-service-engine');

      troupeId1 = mongoUtils.getNewObjectIdString();
      troupeId2 = mongoUtils.getNewObjectIdString();
      troupeId3 = mongoUtils.getNewObjectIdString();
      userId1 = mongoUtils.getNewObjectIdString();
      userId2 = mongoUtils.getNewObjectIdString();
      itemId1 = mongoUtils.getNewObjectIdString();
      itemId2 = mongoUtils.getNewObjectIdString();
      itemId3 = mongoUtils.getNewObjectIdString();
      userIds = [userId1, userId2];
    });

    function chain(promises, done) {
      var p = promises.reduce(function(memo, promise) {
        if(memo) {
          return memo
            .then(function() {
              return promise();
            });
        }

        return promise();

      }, null);

      return p.nodeify(done);
    }

    function newItemForUsers(troupeId, itemId, userIds, mentionUserIds) {
      return function() {
        return unreadItemServiceEngine.newItemWithMentions(troupeId, itemId, userIds, mentionUserIds || []);
      };
    }

    function expectUserUnreadCounts(userId, troupeId, expected) {
      return function() {
        return unreadItemServiceEngine.getUserUnreadCountsForRooms(userId, [troupeId])
          .then(function(result) {
            var unreadCount = result[troupeId].unreadItems;
            assert.strictEqual(unreadCount, expected, 'Expected ' + userId + ' in ' + troupeId + ' to have ' + expected + ' unread items, got ' + unreadCount);
          });
      };
    }

    function expectBadgeCounts(expectedArray) {
      return function() {
        var userIds = expectedArray.map(function(x) { return x[0]; });
        return unreadItemServiceEngine.getBadgeCountsForUserIds(userIds)
          .then(function(result) {
            userIds.forEach(function(userId, index) {
              var actual = result[userId];
              var expected = expectedArray[index][1];
              assert.strictEqual(actual, expected, 'Expected ' + userId + ' to have ' + expected + ' badge count, got ' + actual);
            });
          });
      };
    }

    function expectMentionCounts(userId, expectedArray) {
      return function() {
        var troupeIds = expectedArray.map(function(x) { return x[0]; });
        return unreadItemServiceEngine.getUserUnreadCountsForRooms(userId, troupeIds)
          .then(function(result) {
            troupeIds.forEach(function(troupeId, index) {
              var actual = result[troupeId].mentions;
              var expected = expectedArray[index][1];
              assert.strictEqual(actual, expected, 'Expected ' + userId + ' to have ' + expected + ' mention count in ' + troupeId + ', got ' + actual);
            });
          });
      };
    }

    function markItemRead(userId, troupeId, itemId) {
      return function() {
        return unreadItemServiceEngine.markItemsRead(userId, troupeId, Array.isArray(itemId) ? itemId : [itemId]);
      };
    }

    function ensureAllItemsRead(userId, troupeId) {
      return function() {
        return unreadItemServiceEngine.ensureAllItemsRead(userId, troupeId);
      };
    }

    it('should add unread items in three rooms', function(done) {
      chain([
        expectBadgeCounts([ [userId1, 0], [userId2, 0] ]),

        newItemForUsers(troupeId1, itemId1, userIds, []),
        expectBadgeCounts([ [userId1, 1], [userId2, 1] ]),

        newItemForUsers(troupeId2, itemId2, userIds, []),
        expectBadgeCounts([ [userId1, 2], [userId2, 2] ]),

        newItemForUsers(troupeId3, itemId3, userIds, []),
        expectBadgeCounts([ [userId1, 3], [userId2, 3] ]),

        expectUserUnreadCounts(userId1, troupeId1, 1),
        expectUserUnreadCounts(userId1, troupeId2, 1),
        expectUserUnreadCounts(userId1, troupeId3, 1),
        expectUserUnreadCounts(userId2, troupeId1, 1),
        expectUserUnreadCounts(userId2, troupeId2, 1),
        expectUserUnreadCounts(userId2, troupeId3, 1),
        ],done);
    });

    it('should add three unread items in one room', function(done) {
      chain([
        expectBadgeCounts([ [userId1, 0], [userId2, 0] ]),

        newItemForUsers(troupeId1, itemId1, userIds),
        expectBadgeCounts([ [userId1, 1], [userId2, 1] ]),

        newItemForUsers(troupeId1, itemId2, userIds),
        expectBadgeCounts([ [userId1, 1], [userId2, 1] ]),

        newItemForUsers(troupeId1, itemId3, userIds),
        expectBadgeCounts([ [userId1, 1], [userId2, 1] ]),

        expectUserUnreadCounts(userId1, troupeId1, 3),
        expectUserUnreadCounts(userId2, troupeId1, 3),
        ],done);
    });

    it('should add three unread items in one room, then mark the items as read', function(done) {
      chain([
        expectBadgeCounts([ [userId1, 0], [userId2, 0] ]),

        newItemForUsers(troupeId1, itemId1, userIds),
        newItemForUsers(troupeId1, itemId2, userIds),
        newItemForUsers(troupeId1, itemId3, userIds),

        expectBadgeCounts([ [userId1, 1], [userId2, 1] ]),
        expectUserUnreadCounts(userId1, troupeId1, 3),
        expectUserUnreadCounts(userId2, troupeId1, 3),

        markItemRead(userId1, troupeId1, itemId1),
        expectBadgeCounts([ [userId1, 1], [userId2, 1] ]),
        expectUserUnreadCounts(userId1, troupeId1, 2),

        markItemRead(userId1, troupeId1, itemId2),
        expectUserUnreadCounts(userId1, troupeId1, 1),

        markItemRead(userId1, troupeId1, itemId3),
        expectUserUnreadCounts(userId1, troupeId1, 0),
        expectBadgeCounts([ [userId1, 0], [userId2, 1] ]),
        ],done);
    });

    it('should add three unread items in one room, then mark all as read', function(done) {
      chain([
        expectBadgeCounts([ [userId1, 0], [userId2, 0] ]),

        newItemForUsers(troupeId1, itemId1, userIds),
        newItemForUsers(troupeId1, itemId2, userIds),
        newItemForUsers(troupeId1, itemId3, userIds),

        expectUserUnreadCounts(userId1, troupeId1, 3),
        expectBadgeCounts([ [userId1, 1], [userId2, 1] ]),

        ensureAllItemsRead(userId1, troupeId1),

        expectUserUnreadCounts(userId1, troupeId1, 0),
        expectBadgeCounts([ [userId1, 0], [userId2, 1] ]),
        ],done);
    });

    it('should add mentions', function(done) {
      chain([
        expectMentionCounts(userId1, [ [troupeId1, 0], [troupeId2, 0] ]),
        newItemForUsers(troupeId1, itemId1, userIds, [userId1]),

        expectBadgeCounts([ [userId1, 1] ]),
        expectMentionCounts(userId1, [ [troupeId1, 1], [troupeId2, 0] ]),
        markItemRead(userId1, troupeId1, itemId1),
        expectBadgeCounts([ [userId1, 0], [userId2, 1] ]),
        ],done);
    });

    it('should clear mentions', function(done) {
      chain([
        expectMentionCounts(userId1, [ [troupeId1, 0] ]),
        newItemForUsers(troupeId1, itemId1, userIds, [userId1]),

        expectBadgeCounts([ [userId1, 1] ]),
        expectMentionCounts(userId1, [ [troupeId1, 1] ]),

        ensureAllItemsRead(userId1, troupeId1),
        expectMentionCounts(userId1, [ [troupeId1, 0] ]),

        expectBadgeCounts([ [userId1, 0] ]),
        ],done);
    });

    it('should handle unread items in very large rooms #slow', function(done) {
      var SIZE = 2000;
      var userIds = [];
      var mentionUserIds = [];
      for(var i = 0; i < SIZE; i++) {
        userIds.push(i);
        if(i % 3 === 0) {
          mentionUserIds.push(i);
        }
      }

      return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, mentionUserIds)
        .then(function(result) {

          var expected = _.range(SIZE).reduce(function(memo, index) {
            var result = {
              unreadCount: 1,
              badgeUpdate: true
            };

            if (index % 3 === 0) {
              result.mentionCount = 1;
            }
            memo[index] = result;
            return memo;
          }, {});

          assert.deepEqual(result, expected);

          var userIds = [];
          var mentionUserIds = [];
          for(var i = 0; i < SIZE; i++) {
            userIds.push(i);
            if(i % 3 === 0) {
              mentionUserIds.push(i);
            }
          }

          return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId2, userIds, mentionUserIds);
        })
        .then(function(result) {
          for(var j = 0; j < SIZE; j++) {
            assert(result[j]);
            assert.strictEqual(result[j].unreadCount, 2);
            assert.strictEqual(result[j].badgeUpdate, false);
            if (j % 3 === 0) {
              assert.strictEqual(result[j].mentionCount, 2);
            }
          }

        })
        .nodeify(done);
    });


    it('mentions should not be trashed when the user has more than 100 items #slow', function(done) {
      var userIds = _.range(10).map(function() {
        return mongoUtils.getNewObjectIdString();
      });

      var chatIds = _.range(120).map(function() {
        return "" + mongoUtils.getNewObjectIdString();
      });

      var userId1 = userIds[1];

      return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, [userId1])
        .then(function() {
          return Promise.all(chatIds.map(function(chatId) {
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, chatId, userIds, []);
          }));
        })
        .then(function() {
          return unreadItemServiceEngine.getUserUnreadCountsForRooms(userId1, [troupeId1]);
        })
        .then(function(result) {
          assert.strictEqual(result[troupeId1].unreadItems, 100);
          assert.strictEqual(result[troupeId1].mentions, 1);
          return unreadItemServiceEngine.getUnreadItemsAndMentions(userId1, troupeId1);
        })
        .spread(function(unreadItems, mentions) {
          assert.deepEqual(unreadItems, chatIds.slice(-100));
          assert.deepEqual(mentions, ["" + itemId1]);
          return unreadItemServiceEngine.getUnreadItems(userId1, troupeId1);
        })
        .then(function(unreadItems) {
          assert.deepEqual(unreadItems, ["" + itemId1].concat(chatIds.slice(-100)));

          return unreadItemServiceEngine.getUserUnreadCountsForRooms(userId1, [troupeId1]);
        })
        .then(function(result) {
          assert.strictEqual(result[troupeId1].unreadItems, 100);
          assert.strictEqual(result[troupeId1].mentions, 1);
        })
        .nodeify(done);
    });
  });

  describe('mergeUnreadItemsWithMentions', function() {
    var mergeUnreadItemsWithMentions;

    before(function() {
      mergeUnreadItemsWithMentions = testRequire('./services/unread-item-service-engine').testOnly.mergeUnreadItemsWithMentions;
    });

    it('should handle no items', function() {
      assert.strictEqual(mergeUnreadItemsWithMentions(null, null), null);
      assert.deepEqual(mergeUnreadItemsWithMentions([], []), []);
    });

    it('should handle no mentions', function() {
      assert.deepEqual(mergeUnreadItemsWithMentions(["1"], null), ["1"]);
      assert.deepEqual(mergeUnreadItemsWithMentions(["1"], []), ["1"]);
    });

    it('should handle no unread items', function() {
      assert.deepEqual(mergeUnreadItemsWithMentions(null, ["1"]), ["1"]);
      assert.deepEqual(mergeUnreadItemsWithMentions([], ["1"]), ["1"]);
    });

    it('should handle mentions as subsets of unread items', function() {
      assert.deepEqual(mergeUnreadItemsWithMentions(["1", "2"], ["1"]), ["1", "2"]);
      assert.deepEqual(mergeUnreadItemsWithMentions(["1", "2"], ["1", "2"]), ["1", "2"]);
    });

    it('should handle unread items as subsets of mentions', function() {
      assert.deepEqual(mergeUnreadItemsWithMentions(["1"], ["1", "2"]), ["2", "1"]);
    });

    it('should handle unread items and mentions as disjunct sets', function() {
      assert.deepEqual(mergeUnreadItemsWithMentions(["3", "4"], ["1", "2"]), ["1", "2", "3", "4"]);
    });

  });

  describe('selectTroupeUserBatchForEmails', function() {
    var selectTroupeUserBatchForEmails;

    before(function() {
      selectTroupeUserBatchForEmails = testRequire('./services/unread-item-service-engine').testOnly.selectTroupeUserBatchForEmails;
    });

    it('should limit the maximum number of users in an email batch to 1000', function() {
      var horizonTime = 1;
      var batch = {};
      var expected = {};
      _.range(2000).forEach(function(userId) {
        _.range(3).forEach(function(troupeId, index) {
          batch[troupeId + ':' + userId] = index;
          if (userId < 1000) {
            expected[troupeId + ':' + userId] = true;
          }
        });
      });

      var batchForNotification = selectTroupeUserBatchForEmails(batch, horizonTime);
      assert.deepEqual(batchForNotification, expected);
    });
  });

  describe('transformUserTroupesWithLimit', function() {
    var transformUserTroupesWithLimit;

    before(function() {
      transformUserTroupesWithLimit = testRequire('./services/unread-item-service-engine').testOnly.transformUserTroupesWithLimit;
    });

    it('should limit the maximum number of rooms a user gets notified for to 15', function() {
      var expected = [];
      var userTroupes = [];
      _.range(20).forEach(function(userId, userIndex) {
        _.range(userIndex + 1).forEach(function(troupeId, index) {
          userTroupes.push(troupeId + ':' + userId);

          if (index < 15) {
            expected.push({ troupeId: "" + troupeId, userId: "" + userId });
          }
        });
      });


      var actual = transformUserTroupesWithLimit(userTroupes);
      assert.deepEqual(actual, expected);
    });
  });



});
