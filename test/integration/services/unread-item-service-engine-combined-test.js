"use strict";

var testRequire = require('../test-require');
var Q = require('q');
var assert = require('assert');
var mongoUtils = testRequire('./utils/mongo-utils');
var srand = require('srand');
var qlimit = require('qlimit');
var limit = qlimit(3);
var _ = require('underscore');

Q.longStackSupport = true;

describe('unread-item-service-engine-combined', function() {
  this.timeout(5000);

  describe('integration tests', function() {
    var unreadItemServiceEngine, troupeId1, userId1;

    beforeEach(function() {
      unreadItemServiceEngine = testRequire('./services/unread-item-service-engine');

      troupeId1 = mongoUtils.getNewObjectIdString();
      userId1 = mongoUtils.getNewObjectIdString();
    });

    var newItemForUsers = limit(function (troupeId, itemId, userIds, mentionUserIds) {
      return unreadItemServiceEngine.newItemWithMentions(troupeId, itemId, userIds, mentionUserIds || []);
    });

    var expectUserUnreadCounts = limit(function (userId, troupeId, expected) {
      return unreadItemServiceEngine.getUserUnreadCounts(userId, troupeId)
        .then(function(result) {
          assert.strictEqual(result, expected, 'Expected ' + userId + ' in ' + troupeId + ' to have ' + expected + ' unread items, got ' + result);
        });
    });

    var expectBadgeCounts = limit(function(expectedArray) {
      var userIds = expectedArray.map(function(x) { return x[0]; });
      return unreadItemServiceEngine.getBadgeCountsForUserIds(userIds)
        .then(function(result) {
          userIds.forEach(function(userId, index) {
            var actual = result[userId];
            var expected = expectedArray[index][1];
            assert.strictEqual(actual, expected, 'Expected ' + userId + ' to have ' + expected + ' badge count, got ' + actual);
          });
        });
    });

    var expectMentionCounts = limit(function (userId, expectedArray) {
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
    });

    var markItemsRead = limit(function(userId, troupeId, itemIds) {
      return unreadItemServiceEngine.markItemsRead(userId, troupeId, itemIds);
    });


    var ensureAllItemsRead = limit(function(userId, troupeId) {
      return unreadItemServiceEngine.ensureAllItemsRead(userId, troupeId);
    });

    var idSeed = 0;
    function nextId() {
      idSeed = idSeed + 1000;
       return mongoUtils.createIdForTimestamp(idSeed).toString();
    }

    function runWithSeed(seed, done) {

      var count = 0;
      var unreadItems = {};
      var limit1 = qlimit(1);

      srand.seed(seed);

      function validateResult(result) {
        if(result.unreadCount >= 0) {
          var unreadItemCount = Object.keys(unreadItems).length;
          if(result.unreadCount !== unreadItemCount) {
            assert(unreadItemCount, result.unreadCount);
          }
        }

        if(result.mentionCount >= 0) {
          var mentionCount = Object.keys(unreadItems).filter(function(item) { return unreadItems[item]; }).length;
          if(result.mentionCount !== mentionCount) {
            assert(mentionCount, result.mentionCount);
          }
        }


      }

      (function next() {
        count++;
        if(count > 350) return done();

        var nextOperation = Math.floor(srand.random() * 4);
        [
          /* 0 */
          function addMention(cb) {
            var itemId = nextId();
            // console.log('Add mention');

            return newItemForUsers(troupeId1, itemId, [userId1], [userId1])
                .then(function(result) {
                  var resultForUser = result[userId1];

                  unreadItems[itemId] = true;
                  validateResult(resultForUser);
                })
                .nodeify(cb);
          },
          /* 1 */
          function addItem(cb) {
            var numberOfItems = Math.floor(srand.random() * 10) + 1;
            // console.log('Add ' + numberOfItems + ' items');

            return Q.all(_.range(numberOfItems).map(limit1(function() {
                var itemId = nextId();
                return newItemForUsers(troupeId1, itemId, [userId1])
                  .then(function(result) {
                    var resultForUser = result[userId1];
                    unreadItems[itemId] = false;
                    validateResult(resultForUser);
                  });
              })))
              .nodeify(cb);

          },
          /* 2 */
          function markItemRead(cb) {
            var largeMarkAsRead = srand.random() > 0.80;

            var percentageOfItems = Math.round(srand.random() * (largeMarkAsRead ? 100 : 30) / 100);

            var i = Object.keys(unreadItems);

            var forMarkAsRead = i.slice(0, Math.round(i.length * percentageOfItems + 1));
            // console.log('Mark ' + forMarkAsRead.join(',') + ' items read');

            return markItemsRead(userId1, troupeId1, forMarkAsRead)
              .then(function(result) {
                forMarkAsRead.forEach(function(itemId) {
                  delete unreadItems[itemId];
                });
              })
              .nodeify(cb);

          },
          /* 3 */
          function markAllItemsRead(cb) {
            if(Math.floor(srand.random() * 3) !== 0) return cb();
            // console.log('Mark all items read');
            return ensureAllItemsRead(userId1, troupeId1)
              .then(function(result) {
                unreadItems = {};
                validateResult(result);
              })
              .nodeify(cb);

          }
        ][nextOperation](function(err) {
          if(err) return done(err);
          setImmediate(next);
        });

      })();

    }

    it('test1', function(done) {
      runWithSeed(2345678, done);
    });

    it('test2', function(done) {
      runWithSeed(1231123, done);
    });

    it('test3', function(done) {
      runWithSeed(393828, done);
    });

    it('test4', function(done) {
      runWithSeed(122828, done);
    });

  });




});
