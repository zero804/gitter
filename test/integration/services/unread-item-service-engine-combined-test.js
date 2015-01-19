"use strict";

var testRequire = require('../test-require');
var Q = require('q');
var assert = require('assert');
var mongoUtils = testRequire('./utils/mongo-utils');
var srand = require('srand');
var qlimit = require('qlimit');
var limit = qlimit(3);
var _ = require('underscore');

var TEST_ITERATIONS = 200;

Q.longStackSupport = true;

describe('unread-item-service-engine-combined', function() {
  this.timeout(15000);

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
      var mentionItems = {};

      srand.seed(seed);

      function enforceLimit() {
        var u = Object.keys(unreadItems);
        var l = u.length;
        if(l > 100) {
          while(l > 100) {
            var lowestKey = _.min(u, function(id) {
              return mongoUtils.getTimestampFromObjectId(id);
            });

            delete unreadItems[lowestKey];
            l--;
          }

        }
      }

      function compareUnreadItems(reportedUnreadCount) {
        console.log('comparing results');
        return unreadItemServiceEngine.getUnreadItems(userId1, troupeId1)
          .then(function(items) {
            items.sort();
            var ourKeys = Object.keys(unreadItems);
            for(var i = 0; i < ourKeys.length; i++) {
              if ("" + ourKeys[i] !== "" + items[i]) {
                // console.log('OUR KEYS (length==' + ourKeys.length + ')', JSON.stringify(ourKeys, null, '  '));
                // console.log('REDIS KEYS (length==' + items.length + ')', JSON.stringify(items, null, '  '));
                console.log('>>>> CHECK OUT unread:chat' + userId1 + ':' + troupeId1);
                assert(false, 'sets do not match. first problem at ' + i + ': ours=' + ourKeys[i] + '. theirs=' + items[i]);
              }
            }
            // assert.deepEqual(ourKeys, items);
            // assert.strictEqual(ourKeys.length, reportedUnreadCount);
          });
      }

      function validateResult(result, expectUnread, expectMentions) {
        if(result.unreadCount >= 0) {
          var unreadItemCount = Object.keys(unreadItems).length;
          if(unreadItemCount !== result.unreadCount) {
            return compareUnreadItems();
          }
        } else {
          assert(!expectUnread, "Expencted unread items in the results hash but not there");
        }

        if(result.mentionCount >= 0) {
          var mentionCount = Object.keys(mentionItems).length;
          assert.strictEqual(mentionCount, result.mentionCount);
        } else {
          assert(!expectMentions, "Expencted mentionCount in " + JSON.stringify(result) + " but not there");
        }


      }

      (function next() {
        count++;
        if(count > TEST_ITERATIONS) return done();

        var nextOperation = Math.floor(srand.random() * 4);
        [
          /* 0 */
          function addMention(cb) {
            var itemId = nextId();
            // console.log('Add mention');

            return newItemForUsers(troupeId1, itemId, [userId1], [userId1])
                .then(function(result) {
                  var resultForUser = result[userId1];

                  mentionItems[itemId] = true;
                  unreadItems[itemId] = true;
                  enforceLimit();
                  return validateResult(resultForUser, true, true);
                })
                .nodeify(cb);
          },
          /* 1 */
          function addItem(cb) {
            var numberOfItems = Math.floor(srand.random() * 10) + 1;
            // console.log('Add ' + numberOfItems + ' items');

            return _.range(numberOfItems).reduce(function(memo) {
                function addNewItem() {
                  var itemId = nextId();
                  return newItemForUsers(troupeId1, itemId, [userId1])
                    .then(function(result) {
                      var resultForUser = result[userId1];
                      unreadItems[itemId] = false;
                      enforceLimit();

                      return validateResult(resultForUser, true, false);
                    });
                }
                if(memo) {
                  return memo.then(function() {
                    return addNewItem();
                  });
                }

                return addNewItem();
              }, null)
              .nodeify(cb);

          },
          /* 2 */
          function markItemRead(cb) {
            var largeMarkAsRead = srand.random() > 0.80;

            var percentageOfItems = Math.round(srand.random() * (largeMarkAsRead ? 100 : 30) / 100);

            var i = Object.keys(unreadItems);

            var forMarkAsRead = i.slice(0, Math.round(i.length * percentageOfItems + 1));
            var itemsContainedMentions = forMarkAsRead.some(function(itemId) {
              return unreadItems[itemId];
            });

            // console.log('Marking ' + forMarkAsRead.length + ' items read');

            return markItemsRead(userId1, troupeId1, forMarkAsRead)
              .then(function(result) {
                forMarkAsRead.forEach(function(itemId) {
                  delete unreadItems[itemId];
                  delete mentionItems[itemId];
                });

                return validateResult(result, true, itemsContainedMentions);
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
                var hadMentionIds = Object.keys(mentionItems).length > 0;
                mentionItems = {};
                return validateResult(result, true, hadMentionIds);
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
