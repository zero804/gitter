"use strict";

var testRequire = require('../test-require');
var Q = require('q');
var assert = require('assert');
var mongoUtils = testRequire('./utils/mongo-utils');

Q.longStackSupport = true;

describe('unread-item-service', function() {

  var blockTimer = require('../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  describe('single test cases', function() {

    var unreadItemServiceEngine, troupeId1, itemId1, itemId2, itemId3, userId1, userId2, userIds;

    beforeEach(function() {
      unreadItemServiceEngine = testRequire('./services/unread-item-service-engine');
      troupeId1 = mongoUtils.getNewObjectIdString();
      userId1 = mongoUtils.getNewObjectIdString();
      userId2 = mongoUtils.getNewObjectIdString();
      itemId1 = mongoUtils.getNewObjectIdString();
      itemId2 = mongoUtils.getNewObjectIdString();
      itemId3 = mongoUtils.getNewObjectIdString();
      userIds = [userId1, userId2];
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
            assert.strictEqual(result.unreadCount, undefined);
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
              unreadCount: undefined,
              mentionCount: undefined,
              badgeUpdate: false
            });

          })
          .nodeify(done);
      });

      it('should handle some unread mentions for users', function(done) {
        Q.all([
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

      it('should list users for email notifications', function(done) {
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

          return Q.all([
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
          return Q.all([
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
          return Q.all([
              unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, [userId1], []),
              unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId2, [userId1], []),
              unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId3, [userId1], []),
            ])
            .then(function() {
              unreadItemServiceEngine.markItemsRead(userId1, troupeId1, [itemId1, itemId2, itemId3]);
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
          return Q.all([
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


        it('should not email somebody until the email timeout period has expired', function(done) {
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

        it('should not email somebody twice if no new messages have arrived', function(done) {
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

      });




    });


    describe('getUserUnreadCounts', function() {

      it('should return user unread counts', function(done) {
        unreadItemServiceEngine.getUserUnreadCounts(userId1, troupeId1)
          .then(function(result) {
            assert.strictEqual(result, 0);
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, []);
          })
          .then(function() {
            return unreadItemServiceEngine.getUserUnreadCounts(userId1, troupeId1);
          })
          .then(function(result) {
            assert.strictEqual(result, 1);
          })
          .nodeify(done);
      });

    });


    describe('getUserUnreadCountsForRooms', function() {

      it('should return user unread counts', function(done) {
        unreadItemServiceEngine.getUserUnreadCountsForRooms(userId1, [troupeId1])
          .then(function(result) {
            assert.strictEqual(result[troupeId1], 0);
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, userIds, []);
          })
          .then(function() {
            return unreadItemServiceEngine.getUserUnreadCountsForRooms(userId1, [troupeId1]);
          })
          .then(function(result) {
            assert.strictEqual(result[troupeId1], 1);
          })
          .nodeify(done);
      });


    });


    describe('getUserMentionCountsForRooms', function() {

      it('should return user unread counts', function(done) {
        unreadItemServiceEngine.getUserMentionCountsForRooms(userId1, [troupeId1])
          .then(function(result) {
            assert.strictEqual(result[troupeId1], 0);
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, itemId1, [userId1], [userId1]);
          })
          .then(function() {
            return unreadItemServiceEngine.getUserMentionCountsForRooms(userId1, [troupeId1]);
          })
          .then(function(result) {
            assert.strictEqual(result[troupeId1], 1);
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
              unreadCount: undefined,
              mentionCount: undefined,
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

        for(var i = 0; i < 110; i++) {
          adds.push(unreadItemServiceEngine.newItemWithMentions(troupeId1, mongoUtils.getNewObjectIdString(), [userId1], []));
        }

        blockTimer.reset();
        return Q.all(adds)
          .then(function() {
            blockTimer.reset();
            // Do a single insert sans contention. In the real world, there will never be this much
            // contention for a single usertroupe
            return unreadItemServiceEngine.newItemWithMentions(troupeId1, mongoUtils.getNewObjectIdString(), [userId1], []);
          })
          .delay(100)
          .then(function() {
            return unreadItemServiceEngine.getUserUnreadCounts(userId1, troupeId1);
          })
          .then(function(count) {
            assert.equal(count, 100);
          })
          .nodeify(done);
      });

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
        return unreadItemServiceEngine.getUserUnreadCounts(userId, troupeId)
          .then(function(result) {
            assert.strictEqual(result, expected, 'Expected ' + userId + ' in ' + troupeId + ' to have ' + expected + ' unread items, got ' + result);
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
        return unreadItemServiceEngine.getUserMentionCountsForRooms(userId, troupeIds)
          .then(function(result) {
            troupeIds.forEach(function(troupeId, index) {
              var actual = result[troupeId];
              var expected = expectedArray[index][1];
              assert.strictEqual(actual, expected, 'Expected ' + userId + ' to have ' + expected + ' mention count in ' + troupeId + ', got ' + actual);
            });

            return unreadItemServiceEngine.getUserMentionCounts(userId);
          })
          .then(function(result) {
            troupeIds.forEach(function(troupeId, index) {
              var actual = result[troupeId] || 0;
              var expected = expectedArray[index][1] || 0;
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

  });




});
