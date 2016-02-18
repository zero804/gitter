"use strict";

var redis            = require("../utils/redis");
var winston          = require('../utils/winston');
var mongoUtils       = require('../utils/mongo-utils');
var Scripto          = require('gitter-redis-scripto');
var assert           = require('assert');
var debug            = require('debug')('gitter:unread-items-engine');
var redisClient      = redis.getClient();
var scriptManager    = new Scripto(redisClient);
var _                = require('lodash');
var Promise          = require('bluebird');

scriptManager.loadFromDir(__dirname + '/../../redis-lua/unread');
var EMAIL_NOTIFICATION_HASH_KEY = "unread:email_notify";

var runScript = Promise.promisify(scriptManager.run, { context: scriptManager });

var redisClient_smembers = Promise.promisify(redisClient.smembers, { context: redisClient });
var redisClient_set      = Promise.promisify(redisClient.set, { context: redisClient });
var redisClient_mget     = Promise.promisify(redisClient.mget, { context: redisClient });
var redisClient_hscan    = Promise.promisify(redisClient.hscan, { context: redisClient });
var redisClient_del      = Promise.promisify(redisClient.del, { context: redisClient });
var redisClient_zrange   = Promise.promisify(redisClient.zrange, { context: redisClient });

var UNREAD_BATCH_SIZE = 100;
var PRECONVERT_OBJECTID_TO_STRING_THRESHOLD = 1000;
var MAXIMUM_USERS_PER_UNREAD_NOTIFICATION_BATCH = 1000*3;
var MAXIMUM_ROOMS_PER_USER_PER_NOTIFICATION = 15;

/**
 * Given an array of userIds and an array of mentionUserIds, returns an array of
 * { userIds: [...], mentionUserIds: [...] }
 * such that:
 * a) the `userIds` of any member of the result does not exceed UNREAD_BATCH_SIZE
 * b) the `mentionUserIds` will appear in the same batch as the corresponding element `userIds`,
 *    such that for any element of the result, `member.memberUserIds` ⊆ `member.userIds`
 */
function getNewItemBatches(userIds, mentionUserIds) {
  var mentionUsersHash = _.reduce(mentionUserIds, function(memo, mentionUserId) {
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
    var mentionBatch = _.filter(batch, userIsMentioned);

    results[count] = { userIds: batch, mentionUserIds: mentionBatch };
  }

  return results;
}


/**
 *
 * Note: mentionUserIds must always be a subset of usersIds (or equal)
 */
function newItemWithMentions(troupeId, itemId, userIds, mentionUserIds) {

  var timestamp = mongoUtils.getTimestampFromObjectId(itemId);

  return setLastChatTimestamp(troupeId, timestamp)
    .then(function() {

    if(!userIds.length) return {};

    // Working in strings saves a stack of time
    troupeId = mongoUtils.serializeObjectId(troupeId);

    // Turn all the userIds into strings up front
    // in large rooms this is a big performance gain.
    // In small rooms, it slows things down
    if (userIds.length > PRECONVERT_OBJECTID_TO_STRING_THRESHOLD) {
      userIds = _.map(userIds, mongoUtils.serializeObjectId);
    }

    // Turn all the userIds into strings up front
    // in large rooms this is a big performance gain.
    // In small rooms, it slows things down
    if (mentionUserIds.length > PRECONVERT_OBJECTID_TO_STRING_THRESHOLD) {
      mentionUserIds = _.map(mentionUserIds, mongoUtils.serializeObjectId);
    }

    var batches = getNewItemBatches(userIds, mentionUserIds);

    return Promise.all(_.map(batches, function(batch) {
        var batchUserIds = batch.userIds;
        var batchMentionIds = batch.mentionUserIds;

        // Now talk to redis and do the update
        var keys = [EMAIL_NOTIFICATION_HASH_KEY];
        _.forEach(batchUserIds, function(userId) {
          keys.push("unread:chat:" + userId + ":" + troupeId);
          keys.push("ub:" + userId);
        });

        _.forEach(batchMentionIds, function(mentionUserId) {
          var mentionKey = "m:" + mentionUserId;
          keys.push(mentionKey + ":" + troupeId);
          keys.push(mentionKey);
        });

        var values = [batchUserIds.length, troupeId, itemId, timestamp].concat(batchUserIds);

        return runScript('unread-add-item-with-mentions', keys, values);
      }))
      .then(function(results) {
        var resultHash = {};

        // Using _.forEach as its much faster than native in a tight loop like this
        _.forEach(results, function(result, index) {
          var batch = batches[index];
          var batchUserIds = batch.userIds;
          var batchMentionIds = batch.mentionUserIds;

          var upgradeCount = 0;
          // Using _.forEach as its much faster than native in a tight loop like this
          _.forEach(batchUserIds, function(userId) {
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
            debug('unread-items: upgraded keys for %s user:troupes', upgradeCount);
          }

          _.forEach(batchMentionIds, function(mentionUserId) {
            var mentionCount = result.shift();
            resultHash[mentionUserId].mentionCount = mentionCount >= 0 ? mentionCount : undefined;
          });

        });

        return resultHash;
      });
  });
}


function setLastChatTimestamp(troupeId, timestamp) {
  return redisClient_set("lmts:" + troupeId, timestamp);
}

function getLastChatTimestamps(troupeIds) {
  if (!troupeIds || !troupeIds.length) {
    return Promise.resolve([]);
  }

  var tsCacheKeys = troupeIds.map(function(troupeId) {
    return "lmts:" + troupeId;
  });

  return redisClient_mget(tsCacheKeys);
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
 * Given a potentially very large number of troupe user keys
 * for email, select a batch that we will send emails out to
 */
function selectTroupeUserBatchForEmails(troupeUserHash, horizonTime) {
  var distinctUserIds = {};
  var distinctUserCount = 0;

  var troupeUserHashKeys = Object.keys(troupeUserHash);

  debug('%s distinct usertroupes with pending emails', troupeUserHashKeys.length);

  if (!troupeUserHashKeys.length) return {};

  var result = {};

  /* Filter out values which are too recent */
  troupeUserHashKeys.forEach(function(troupeUserKey) {
    // Don't bother if the total exceeds the maximum number of users in a single batch
    if (distinctUserCount >= MAXIMUM_USERS_PER_UNREAD_NOTIFICATION_BATCH) return;

    var value = troupeUserHash[troupeUserKey];
    if(value === 'null' && !value) return;

    var oldest = parseInt(value, 10);
    if (oldest <= horizonTime) {
      var troupeUserId = troupeUserKey.split(':');
      var userId = troupeUserId[1];

      // Add the user to the list of distinct users
      // who will be receiving an email in this batch
      if (!distinctUserIds[userId]) {
        distinctUserIds[userId] = true;
        distinctUserCount++;
      }
      result[troupeUserKey] = true;
    }
  });

  /* Add in all the rooms for the users we are going to email */
  /* Filter out values which are too recent */
  troupeUserHashKeys.forEach(function(key) {
    var troupeUserId = key.split(':');
    var userId = troupeUserId[1];

    if (distinctUserIds[userId]) {
      result[key] = true;
    }
  });

  return result;
}

/**
 *  Given a list of userTroupes, return an array of { user: troupe: }
 *  Also limits the maximum number of rooms per user. So if a
 *  user has too many rooms for notification we don't kill the server
 */
function transformUserTroupesWithLimit(userTroupes) {
  var troupesPerUser = {};

  return userTroupes.reduce(function(memo, key) {
    var troupeUserId = key.split(':');
    var troupeId = troupeUserId[0];
    var userId = troupeUserId[1];

    if(troupesPerUser[userId]) {
      if (troupesPerUser[userId] >= MAXIMUM_ROOMS_PER_USER_PER_NOTIFICATION) {
        /* Skip */
        return memo;
      }

      troupesPerUser[userId]++;
    } else {
      troupesPerUser[userId] = 1;
    }

    memo.push({ userId: userId, troupeId: troupeId });
    return memo;
  },[]);
}

/**
 * HGETALL can take down your redis server if the hash is big enough.
 * This way, we scan the redis server and return things chunk at a time
 */
function scanEmailNotifications() {
  var cursor = '0';
  var hashValues = {};
  function iter() {
    return redisClient_hscan(EMAIL_NOTIFICATION_HASH_KEY, cursor, 'COUNT', 1000)
      .spread(function(nextCursor, result) {
        /* Turn the results into a hash */
        if (result) {
          for (var i = 0; i < result.length; i = i + 2) {
            var key = result[i];
            var value = result[i + 1];
            hashValues[key] = value;
          }
        }

        if (nextCursor === '0') return;

        cursor = nextCursor;
        return iter();
      });
  }

  return iter()
    .then(function() {
      return hashValues;
    });
}
/**
 * Returns a hash of hash {user:troupe:ids} of users who have
 * outstanding notifications since before the specified time
 * @return a promise of hash
 */
function listTroupeUsersForEmailNotifications(horizonTime, emailLatchExpiryTimeS) {
  return scanEmailNotifications()
    .then(function(troupeUserHash) {
      if (!troupeUserHash) return {};

      var userTroupesForNotification = selectTroupeUserBatchForEmails(troupeUserHash, horizonTime);

      var filteredKeys = Object.keys(userTroupesForNotification);
      debug('Attempting to send email notifications to %s usertroupes', filteredKeys.length);

      var keys = [EMAIL_NOTIFICATION_HASH_KEY].concat(filteredKeys.map(function(troupeUserKey) {
        return 'uel:' + troupeUserKey;
      }));

      var values = [emailLatchExpiryTimeS].concat(filteredKeys);

      return runScript('unread-latch-emails', keys, values)
        .then(function(results) {

          /* Remove items that have an email latch on */
          var filteredUserTroupes = filteredKeys.filter(function(value, i) {
            return results[i];
          });

          var userTroupes = transformUserTroupesWithLimit(filteredUserTroupes);

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
  return redisClient_del(EMAIL_NOTIFICATION_HASH_KEY);
}

/**
 * @return hash of { troupe: { total: x, mentions: y } }
 */
function getUserUnreadCountsForRooms(userId, troupeIds) {
  var keys = troupeIds.reduce(function(memo, troupeId) {
    memo.push("unread:chat:" + userId + ":" + troupeId);
    memo.push("m:" + userId + ":" + troupeId);
    return memo;
  }, []);

  return runScript('unread-item-count', keys, [])
    .then(function(replies) {
      return troupeIds.reduce(function(memo, troupeId, index) {
        memo[troupeId] = { unreadItems: replies[index * 2], mentions: replies[index * 2 + 1] };
        return memo;
      }, {});
    });
}

/*
 * Returns all unread items and mentions for a user in a room. Returns two arrays:
 * [ unread_items, mentions ]
 */
function getUnreadItemsAndMentions(userId, troupeId) {
  var keys = ["unread:chat:" + userId + ":" + troupeId, "m:" + userId + ":" + troupeId];
  return runScript('unread-item-list-with-mentions', keys, []);
}

function makeSet(array) {
  var set = {};
  if (!array) return set;
  var length = array.length;
  if (!array.length) return set;

  for (var i = 0; i < length; i++) {
    set[array[i]] = true;
  }
  return set;
}

// Performance optimised merge of two sets
function mergeUnreadItemsWithMentions(unreadItems, mentions) {
  if (!mentions || !mentions.length) return unreadItems;
  if (!unreadItems || !unreadItems.length) return mentions;

  var mentionSet = makeSet(mentions);
  var outstandingMentionCount = mentions.length;

  for (var i = 0, len = unreadItems.length; i < len; i++) {
    var item = unreadItems[i];
    if (mentionSet[item]) {
      delete mentionSet[item];
      outstandingMentionCount--;

      // Mentions is a subset of unread items. Done.
      if (!outstandingMentionCount) return unreadItems;
    }
  }

  // Add the mentions to the **beginning** as the reason they're not
  // in the unread item list is that they're old enough to have slipped
  // out the end of the unread items list. Their correct ordering is
  // therefore at the front of the array.
  return Object.keys(mentionSet).concat(unreadItems);
}

function getUnreadItems(userId, troupeId) {
  return getUnreadItemsAndMentions(userId, troupeId)
    .spread(function(unreadItems, mentions) {
      return mergeUnreadItemsWithMentions(unreadItems, mentions);
    });
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
    });
}

/**
 * Returns an array of troupeIds for rooms with mention counts
 * Array looks like [{ troupeId: x, unreadItems: y, mentions: z }]
 */
function getAllUnreadItemCounts(userId) {
  // This requires two separate calls, doesnt work as a lua script
  // as we can't predict the keys before the first call...
  return redisClient_zrange("ub:" + userId, 0, -1)
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
  return redisClient_smembers("m:" + userId);
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

  return Promise.fromCallback(function(callback) {
      multi.exec(callback);
    })
    .then(function(replies) {
      var result = {};

      userIds.forEach(function(userId, index) {
        var reply = replies[index];
        result[userId] = reply;
      });

      return result;
    });
}


function getRoomsCausingBadgeCount(userId) {
  return redisClient_zrange(["ub:" + userId, 0, -1]);
}

/**
 * Exports
 */
exports.newItemWithMentions = newItemWithMentions;
exports.removeItem = removeItem;
exports.ensureAllItemsRead = ensureAllItemsRead;
exports.markItemsRead = markItemsRead;
exports.listTroupeUsersForEmailNotifications = listTroupeUsersForEmailNotifications;

exports.getUserUnreadCountsForRooms = getUserUnreadCountsForRooms;

exports.getUnreadItems = getUnreadItems;
exports.getUnreadItemsAndMentions = getUnreadItemsAndMentions;
exports.getUnreadItemsForUserTroupes = getUnreadItemsForUserTroupes;

exports.getAllUnreadItemCounts = getAllUnreadItemCounts;
exports.getRoomsMentioningUser = getRoomsMentioningUser;
exports.getBadgeCountsForUserIds = getBadgeCountsForUserIds;
exports.getRoomsCausingBadgeCount = getRoomsCausingBadgeCount;

exports.getLastChatTimestamps = getLastChatTimestamps;

exports.testOnly = {
  getNewItemBatches: getNewItemBatches,
  UNREAD_BATCH_SIZE: UNREAD_BATCH_SIZE,
  removeAllEmailNotifications: removeAllEmailNotifications,
  mergeUnreadItemsWithMentions: mergeUnreadItemsWithMentions,
  redisClient: redisClient,
  selectTroupeUserBatchForEmails: selectTroupeUserBatchForEmails,
  transformUserTroupesWithLimit: transformUserTroupesWithLimit,
  setLastChatTimestamp: setLastChatTimestamp
};
