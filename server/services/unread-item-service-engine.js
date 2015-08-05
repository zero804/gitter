/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var redis            = require("../utils/redis");
var winston          = require('../utils/winston');
var mongoUtils       = require('../utils/mongo-utils');
var Scripto          = require('gitter-redis-scripto');
var Q                = require('q');
var assert           = require('assert');
var debug            = require('debug')('gitter:unread-items-engine');
var redisClient      = redis.getClient();
var scriptManager    = new Scripto(redisClient);

scriptManager.loadFromDir(__dirname + '/../../redis-lua/unread');
var EMAIL_NOTIFICATION_HASH_KEY = "unread:email_notify";

var runScript = Q.nbind(scriptManager.run, scriptManager);
var redisClient_smembers = Q.nbind(redisClient.smembers, redisClient);

var UNREAD_BATCH_SIZE = 100;

/**
 * Given an array of userIds and an array of mentionUserIds, returns an array of
 * { userIds: [...], mentionUserIds: [...] }
 * such that:
 * a) the `userIds` of any member of the result does not exceed UNREAD_BATCH_SIZE
 * b) the `mentionUserIds` will appear in the same batch as the corresponding element `userIds`,
 *    such that for any element of the result, `member.memberUserIds` ⊆ `member.userIds`
 */
function getNewItemBatches(userIds, mentionUserIds) {
  var mentionUsersHash = mentionUserIds.reduce(function(memo, mentionUserId) {
    memo[mentionUserId] = true;
    return memo;
  }, {});

  function userIsMentioned(userId) {
    return mentionUsersHash[userId];
  }

  var length = userIds.length;
  /* Preallocate the array to the correct size */
  var results = new Array(~~(userIds.length / UNREAD_BATCH_SIZE) + ((userIds.length % UNREAD_BATCH_SIZE) === 0 ? 0 : 1));

  for (var i = 0, count = 0; i < length; i += UNREAD_BATCH_SIZE, count++) {
    var batch = userIds.slice(i, i + UNREAD_BATCH_SIZE);
    var mentionBatch = batch.filter(userIsMentioned);

    results[count] = { userIds: batch, mentionUserIds: mentionBatch };
  }

  return results;
}

/**
 *
 * Note: mentionUserIds must always be a subset of usersIds (or equal)
 */
function newItemWithMentions(troupeId, itemId, userIds, mentionUserIds) {
  if(!userIds.length) return Q.resolve({});

  var batches = getNewItemBatches(userIds, mentionUserIds);

  var timestamp = mongoUtils.getTimestampFromObjectId(itemId);

  return Q.all(batches.map(function(batch) {
      var batchUserIds = batch.userIds;
      var batchMentionIds = batch.mentionUserIds;

      // Now talk to redis and do the update
      var keys = [EMAIL_NOTIFICATION_HASH_KEY];
      batchUserIds.forEach(function(userId) {
        keys.push("unread:chat:" + userId + ":" + troupeId);
        keys.push("ub:" + userId);
      });

      batchMentionIds.forEach(function(mentionUserId) {
        keys.push("m:" + mentionUserId + ":" + troupeId);
        keys.push("m:" + mentionUserId);
      });

      var values = [batchUserIds.length, troupeId, itemId, timestamp].concat(batchUserIds);

      return runScript('unread-add-item-with-mentions', keys, values);
    }))
    .then(function(results) {
      var resultHash = {};

      results.forEach(function(result, index) {
        var batch = batches[index];
        var batchUserIds = batch.userIds;
        var batchMentionIds = batch.mentionUserIds;

        var upgradeCount = 0;
        batchUserIds.forEach(function(userId) {
          var troupeUnreadCount   = result.shift();
          var flag                = result.shift();
          var badgeUpdate         = !!(flag & 1);
          var upgradedKey          = flag & 2;

          resultHash[userId] = {
            unreadCount: troupeUnreadCount >= 0 ? troupeUnreadCount : undefined,
            badgeUpdate: badgeUpdate
          };

          if(upgradedKey) {
            upgradeCount++;
          }
        });

        if (upgradeCount > 10) {
          winston.warn('unread-items: upgraded keys for ' + upgradeCount + ' user:troupes');
        } else if(upgradeCount > 0) {
          debug('unread-items: upgraded keys for user:troupes', upgradeCount);
        }

        batchMentionIds.forEach(function(mentionUserId) {
          var mentionCount = result.shift();
          resultHash[mentionUserId].mentionCount = mentionCount >= 0 ? mentionCount : undefined;
        });

      });

      return resultHash;
    });
}

/**
 * Item removed
 * @return {promise} promise of nothing
 */
function removeItem(troupeId, itemId, userIds) {
  var keys = userIds.reduce(function(memo, userId) {
      memo.push(
        "unread:chat:" + userId + ":" + troupeId,                 // Unread for user
        "ub:" + userId,                                           // Unread badge for user
        "m:" + userId + ":" + troupeId,                           // User Troupe mention items
        "m:" + userId                                             // User mentions
      );

      return memo;
    }, []);

  return runScript('unread-remove-item', keys, [troupeId, itemId])
    .then(function(result) {
      var results = [];

      // Results come back as three items per key in sequence
      for(var i = 0; result.length > 0; i++) {
        var troupeUnreadCount   = result.shift();
        var mentionCount        = result.shift();
        var flag                = result.shift();
        var badgeUpdate         = !!(flag & 1);
        var userId              = userIds[i];

        results.push({
          userId: userId,
          unreadCount: troupeUnreadCount >= 0 ? troupeUnreadCount : undefined,
          mentionCount: mentionCount >= 0 ? mentionCount : undefined,
          badgeUpdate: badgeUpdate
        });

      }

      return results;
    });

}

/*
  This ensures that if all else fails, we clear out the unread items
  It should only have any effect when data is inconsistent
*/
function ensureAllItemsRead(userId, troupeId) {
  assert(userId, 'Expected userId');
  assert(troupeId, 'Expected troupeId');

  var keys = [
      "ub:" + userId,
      "unread:chat:" + userId + ":" + troupeId,
      EMAIL_NOTIFICATION_HASH_KEY,
      "m:" + userId + ":" + troupeId,
      "m:" + userId,
      'uel:' + troupeId + ":" + userId
    ];

  var values = [troupeId, userId];
  return runScript('unread-ensure-all-read', keys, values)
    .then(function(flag) {
      var badgeUpdate = flag > 0;

      return {
        unreadCount: 0,
        mentionCount: 0,
        badgeUpdate: badgeUpdate
      };
    });
}

/**
 * Mark an item in a troupe as having been read by a user
 * @return {promise} promise of nothing
 */
function markItemsRead(userId, troupeId, ids) {
  var keys = [
      "ub:" + userId,
      "unread:chat:" + userId + ":" + troupeId,
      EMAIL_NOTIFICATION_HASH_KEY,
      "m:" + userId + ":" + troupeId,
      "m:" + userId,
      'uel:' + troupeId + ":" + userId,
    ];

  var values = [troupeId, userId].concat(ids);

  return runScript('unread-mark-items-read', keys, values)
    .then(function(result) {
      var troupeUnreadCount   = result[0];
      var mentionCount        = result[1];
      var flag                = result[2];
      var badgeUpdate         = !!(flag & 1);

      return {
        unreadCount: troupeUnreadCount >= 0 ? troupeUnreadCount : undefined,
        mentionCount: mentionCount >= 0 ? mentionCount : undefined,
        badgeUpdate: badgeUpdate
      };
    });
}

/**
 * Returns a hash of hash {user:troupe:ids} of users who have
 * outstanding notifications since before the specified time
 * @return a promise of hash
 */
function listTroupeUsersForEmailNotifications(horizonTime, emailLatchExpiryTimeS) {
  return Q.ninvoke(redisClient, "hgetall", EMAIL_NOTIFICATION_HASH_KEY)
    .then(function(troupeUserHash) {
      if (!troupeUserHash) return {};

      var userTroupesForNotification = {};

      /* Filter out values which are too recent */
      Object.keys(troupeUserHash).forEach(function(key) {
        var value = troupeUserHash[key];
        if(value === 'null') return;

        var oldest = parseInt(value, 10);
        if (oldest <= horizonTime) {
          userTroupesForNotification[key] = 1;
        }
      });

      if(!Object.keys(userTroupesForNotification).length) return {};

      // Find the distinct list of users
      var distinctUserIds = {};
      Object.keys(userTroupesForNotification).forEach(function(troupeUserKey) {
        var troupeUserId = troupeUserKey.split(':');
        var userId = troupeUserId[1];
        distinctUserIds[userId] = 1;
      });


      /* Add in all the rooms for the users we are going to email */
      /* Filter out values which are too recent */
      Object.keys(troupeUserHash).forEach(function(key) {
        var troupeUserId = key.split(':');
        var userId = troupeUserId[1];

        if (distinctUserIds[userId]) {
          userTroupesForNotification[key] = 1;
        }
      });

      var filteredKeys = Object.keys(userTroupesForNotification);

      var keys = [EMAIL_NOTIFICATION_HASH_KEY].concat(filteredKeys.map(function(troupeUserKey) {
        return 'uel:' + troupeUserKey;
      }));

      var values = [emailLatchExpiryTimeS].concat(filteredKeys);

      return runScript('unread-latch-emails', keys, values)
        .then(function(results) {

          /* Remove items that have an email latch on */
          var userTroupes = filteredKeys.filter(function(value, i) {
            return results[i];
          }).map(function(key) {
            var troupeUserId = key.split(':');
            var troupeId = troupeUserId[0];
            var userId = troupeUserId[1];

            return { userId: userId, troupeId: troupeId };
          });


          return [userTroupes, getUnreadItemsForUserTroupes(userTroupes)];
        })
        .spread(function(userTroupes, userTroupeUnreadItems) {
          var result = {};
          userTroupes.forEach(function(userTroupe) {
            var userId = userTroupe.userId;
            var troupeId = userTroupe.troupeId;

            var items = userTroupeUnreadItems[userId + ":" + troupeId];
            if(items && items.length) {
              var v = result[userId];
              if(!v) {
                v = { };
                result[userId] = v;
              }

              v[troupeId] = items;
            }
          });
          return result;
        });

    });
}

function removeAllEmailNotifications() {
  return Q.ninvoke(redisClient, "del", EMAIL_NOTIFICATION_HASH_KEY);
}

function getUserUnreadCounts(userId, troupeId) {
  var key = "unread:chat:" + userId + ":" + troupeId;
  return runScript('unread-item-count', [key], [])
    .then(function(result) {
      return result[0] || 0;
    });
}

function getUserUnreadCountsForRooms(userId, troupeIds) {
  var keys = troupeIds.map(function(troupeId) {
    return "unread:chat:" + userId + ":" + troupeId;
  });

  return runScript('unread-item-count', keys, [])
    .then(function(replies) {
      return troupeIds.reduce(function(memo, troupeId, index) {
        memo[troupeId] = replies[index];
        return memo;
      }, {});
    });
}

function getUserMentions(userId) {
  return redisClient_smembers("m:" + userId)
    .then(function(troupeIds) {
      return getUserMentionsForRooms(userId, troupeIds);
    });
}

function getUserMentionCounts(userId) {
  return redisClient_smembers("m:" + userId)
    .then(function(troupeIds) {
      return getUserMentionsForRooms(userId, troupeIds, {onlyCounts: true});
    });
}

function getUserMentionCountsForRooms(userId, troupeIds) {
  return getUserMentionsForRooms(userId, troupeIds, {onlyCounts: true});
}

function getUserMentionsForRoom(userId, troupeId) {
  return getUserMentionsForRooms(userId, [troupeId])
  .then(function(results) {
    return results[troupeId] || [];
  });
}


function getUserMentionsForRooms(userId, troupeIds, options) {
  options = options || {};
  var multi = redisClient.multi();

  troupeIds.forEach(function(troupeId) {
    var key = "m:" + userId + ":" + troupeId;
    if (options.onlyCounts) { multi.scard(key); } else { multi.smembers(key); }
  });

  var d = Q.defer();

  multi.exec(function(err, replies) {
    if(err) return d.reject(err);

    var result = troupeIds.reduce(function(memo, troupeId, index) {
      memo[troupeId] = replies[index];
      return memo;
    }, {});

    d.resolve(result);
  });

  return d.promise;
}

/*
 * Returns all unread items and mentions for a user in a room. Returns two arrays:
 * [ unread_items, mentions ]
 */
function getUnreadItemsAndMentions(userId, troupeId) {
  var keys = ["unread:chat:" + userId + ":" + troupeId, "m:" + userId + ":" + troupeId];
  return runScript('unread-item-list-with-mentions', keys, [])
    .catch(function(err) {
      /* Not sure why we're doing this? */
      winston.warn("unreadItemService.getUnreadItems failed:" + err, { exception: err });
      // Mask error
      return [[], []];
    });
}

function getUnreadItems(userId, troupeId) {
  var keys = ["unread:chat:" + userId + ":" + troupeId];
  return runScript('unread-item-list', keys, [])
    .catch(function(err) {
      /* Not sure why we're doing this? */
      winston.warn("unreadItemService.getUnreadItems failed:" + err, { exception: err });
      // Mask error
      return [];
    });
}

function getMentions(userId, troupeId) {
  return redisClient_smembers("m:" + userId + ":" + troupeId);
}

/**
 * Returns a hash of unread items for user troupes
 *
 * Hash looks like: { "userId:troupeId": [itemId, itemId], etc }
 */
function getUnreadItemsForUserTroupes(userTroupes) {
  var keys = userTroupes.map(function(userTroupe) {
    return "unread:chat:" + userTroupe.userId + ":" + userTroupe.troupeId;
  });

  return runScript('unread-item-list-multi', keys, [])
    .then(function(results) {
      return userTroupes.reduce(function(memo, userTroupe, index) {
        memo[userTroupe.userId + ":" + userTroupe.troupeId] = results[index];
        return memo;
      }, {});
    })
    .catch(function(err) {
      /* Not sure why we're doing this? */
      winston.warn("unreadItemService.getUnreadItems failed:" + err, { exception: err });
      // Mask error
      return {};
    });
}

/**
 * Returns an array of troupeIds for rooms with mention counts
 * Array looks like [{ troupeId: x, unreadItems: y, mentions: z }]
 */
function getAllUnreadItemCounts(userId) {
  // This requires two separate calls, doesnt work as a lua script
  // as we can't predict the keys before the first call...
  return Q.ninvoke(redisClient, "zrange", "ub:" + userId, 0, -1)
    .then(function(troupeIds) {
      if(!troupeIds || !troupeIds.length) return [];

      var keys = [];
      troupeIds.forEach(function(troupeId) {
        keys.push("unread:chat:" + userId + ":" + troupeId);
        keys.push("m:" + userId + ":" + troupeId);
      });

      // We use unread-item-count with user-troupes and mentions
      return runScript('unread-item-count', keys, [])
        .then(function(counts) {
          return troupeIds.map(function(troupeId, index) {
            return {
              troupeId: troupeId,
              unreadItems: counts[index * 2],
              mentions: counts[index * 2 + 1]
            };
          });
        });
    });
}

/**
 * Returns an array of troupeIds for rooms with mention counts
 */
function getRoomsMentioningUser(userId) {
  return redisClient_smembers("m:" + userId)
    .catch(function(err) {
      /* Not sure why we need to do this? */
      winston.warn("unreadItemService.getRoomIdsMentioningUser failed:" + err, { exception: err });
      // Mask error
      return [];
    });
}


/**
 * Get the badge counts for userIds
 * @return promise of a hash { userId1: 1, userId: 2, etc }
 */
function getBadgeCountsForUserIds(userIds) {
  var multi = redisClient.multi();

  userIds.forEach(function(userId) {
    multi.zcard("ub:" + userId);
  });

  var d = Q.defer();

  multi.exec(function(err, replies) {
    if(err) return d.reject(err);

    var result = {};

    userIds.forEach(function(userId, index) {
      var reply = replies[index];
      result[userId] = reply;
    });

    d.resolve(result);
  });

  return d.promise;
}


function getRoomsCausingBadgeCount(userId) {
  return Q.ninvoke(redisClient, "zrange", ["ub:" + userId, 0, -1]);
}

/**
 * Exports
 */
exports.newItemWithMentions = newItemWithMentions;
exports.removeItem = removeItem;
exports.ensureAllItemsRead = ensureAllItemsRead;
exports.markItemsRead = markItemsRead;
exports.listTroupeUsersForEmailNotifications = listTroupeUsersForEmailNotifications;

exports.getUserUnreadCounts = getUserUnreadCounts;
exports.getUserUnreadCountsForRooms = getUserUnreadCountsForRooms;

exports.getUserMentions = getUserMentions;
exports.getUserMentionCounts = getUserMentionCounts;
exports.getUserMentionCountsForRooms = getUserMentionCountsForRooms;
exports.getUserMentionsForRooms = getUserMentionsForRooms;
exports.getUserMentionsForRoom = getUserMentionsForRoom;


exports.getUnreadItems = getUnreadItems;
exports.getMentions = getMentions;
exports.getUnreadItemsAndMentions = getUnreadItemsAndMentions;
exports.getUnreadItemsForUserTroupes = getUnreadItemsForUserTroupes;

exports.getAllUnreadItemCounts = getAllUnreadItemCounts;
exports.getRoomsMentioningUser = getRoomsMentioningUser;
exports.getBadgeCountsForUserIds = getBadgeCountsForUserIds;
exports.getRoomsCausingBadgeCount = getRoomsCausingBadgeCount;

exports.testOnly = {
  getNewItemBatches: getNewItemBatches,
  UNREAD_BATCH_SIZE: UNREAD_BATCH_SIZE,
  removeAllEmailNotifications: removeAllEmailNotifications
};
