/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var redis            = require("../utils/redis");
var winston          = require('../utils/winston');
var mongoUtils       = require('../utils/mongo-utils');
var Scripto          = require('gitter-redis-scripto');
var Q                = require('q');
var assert           = require('assert');
var redisClient      = redis.getClient();
var scriptManager    = new Scripto(redisClient);
scriptManager.loadFromDir(__dirname + '/../../redis-lua/unread');
var EMAIL_NOTIFICATION_HASH_KEY = "unread:email_notify";
var EventEmitter     = require('events').EventEmitter;

var engine = new EventEmitter();

var runScript = Q.nbind(scriptManager.run, scriptManager);
var redisClient_smembers = Q.nbind(redisClient.smembers, redisClient);

function upgradeKeyToSortedSet(userId, troupeId) {
  var key = "unread:chat:" + userId + ":" + troupeId;
  var userBadgeKey = "ub:" + userId;

  winston.verbose('unread-item-key-upgrade: attempting to upgrade ' + key);

  var d = Q.defer();

  // Use a new client due to the WATCH semantics (don't use getClient!)
  redis.createTransientClient(function(err, redisClient) {
    if(err) return d.reject(err);

    function done(err) {
      redis.quit(redisClient);

      if(err) {
        winston.verbose('unread-item-key-upgrade: upgrade failed' + err, { exception: err });
        d.reject(err);
      } else {
        winston.verbose('unread-item-key-upgrade: upgrade completed successfully');
        d.resolve();
      }
    }

    /**
     * Fairly certain that we don't need the userBadgeKey in the lock.
     * If we did so, changes to other userTroupes could starve this
     * transaction. Also all changes to the specific key on the userBadge
     * that we are changing will always affect the `key` too so we'll
     * be safe from inconsistencies that way.
     *
     * IF WE'RE GETTING INCONSISTENCIES, review this later!
     */
    redisClient.watch(key, function(err) {
      if(err) return done(err);

      redisClient.type(key, function(err, keyType) {
        if(err) return done(err);

        /* Go home redis, you're drunk */
        keyType = ("" + keyType).trim();

        /* If the key isn't a set our job is done */
        if(keyType !== 'set') {
          winston.verbose('unread-item-key-upgrade: upgrade already happened: type=' + keyType);
          return done();
        }

        redisClient.smembers(key, function(err, itemIds) {
          if(err) return done(err);

          var multi = redisClient.multi();

          var zaddArgs = [key];

          var itemIdsWithScores = itemIds.map(function(itemId) {
            var timestamp = mongoUtils.getTimestampFromObjectId(itemId);

            /* ZADD score member */
            return [timestamp, itemId];
          });


          /* Sort by timestamp */
          itemIdsWithScores.sort(function(a, b) {
            return a[0] - b[0];
          });

          /* Truncate down to 100 */
          itemIdsWithScores = itemIdsWithScores.slice(-100);

          itemIdsWithScores.forEach(function(itemWithScore) {
            /* ZADD score member */
            zaddArgs.push(itemWithScore[0], itemWithScore[1]);
          });

          multi.del(key);
          multi.zadd.apply(multi, zaddArgs);
          multi.zrem(userBadgeKey, troupeId);
          multi.zadd(userBadgeKey, itemIdsWithScores.length, troupeId);

          multi.exec(done);

        });


      });
    });
  });

  return d.promise;
}

/**
 *
 * Note: mentionUserIds must always be a subset of usersIds (or equal)
 */
function newItemWithMentions(troupeId, itemId, userIds, mentionUserIds) {
  if(!userIds.length) return Q.resolve([]);

  // Now talk to redis and do the update
  var keys = [EMAIL_NOTIFICATION_HASH_KEY];
  userIds.forEach(function(userId) {
    keys.push("unread:chat:" + userId + ":" + troupeId);
    keys.push("ub:" + userId);
  });

  mentionUserIds.forEach(function(mentionUserId) {
    keys.push("m:" + mentionUserId + ":" + troupeId);
    keys.push("m:" + mentionUserId);
  });

  var timestamp = mongoUtils.getTimestampFromObjectId(itemId);
  var values = [userIds.length, troupeId, itemId, timestamp].concat(userIds);

  return runScript('unread-add-item-with-mentions', keys, values)
    .then(function(result) {
      var resultHash = {};

      userIds.forEach(function(userId) {
        var troupeUnreadCount   = result.shift();
        var flag                = result.shift();
        var badgeUpdate         = !!(flag & 1);
        var upgradeKey          = flag & 2;

        if (badgeUpdate) {
          engine.emit('badge.update', userId);
        }

        if (troupeUnreadCount >= 0) {
          engine.emit('unread.count', userId, troupeId, troupeUnreadCount);
        }

        resultHash[userId] = {
          unreadCount: troupeUnreadCount >= 0 ? troupeUnreadCount : undefined,
          badgeUpdate: badgeUpdate
        };

        if(upgradeKey) {
          // Upgrades can happen asynchoronously
          upgradeKeyToSortedSet(userId, troupeId);
        }
      });

      mentionUserIds.forEach(function(mentionUserId) {
        var mentionCount = result.shift();
        resultHash[mentionUserId].mentionCount = mentionCount >= 0 ? mentionCount : undefined;
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

        if (badgeUpdate) {
          engine.emit('badge.update', userId);
        }

        if (troupeUnreadCount >= 0) {
          engine.emit('unread.count', userId, troupeId, troupeUnreadCount);
        }

        if (mentionCount >= 0) {
          engine.emit('mention.count', userId, troupeId, mentionCount);
        }

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

      if (badgeUpdate) {
        engine.emit('badge.update', userId);
      }

      engine.emit('unread.count', userId, troupeId, 0);
      engine.emit('mention.count', userId, troupeId, 0, 'remove');

      return {
        unreadCount: 0,
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

      if (badgeUpdate) {
        engine.emit('badge.update', userId);
      }

      if (troupeUnreadCount >= 0) {
        engine.emit('unread.count', userId, troupeId, troupeUnreadCount);
      }

      if (mentionCount >= 0) {
        engine.emit('mention.count', userId, troupeId, mentionCount);
      }

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

      /* Filter out values which are too recent */
      var filteredKeys = Object.keys(troupeUserHash).filter(function(key) {
        var value = troupeUserHash[key];
        if(value === 'null') return false;

        var oldest = parseInt(value, 10);
        return oldest <= horizonTime;
      });

      if(!filteredKeys.length) return {};

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

function getUserMentionCounts(userId) {
  return redisClient_smembers("m:" + userId)
    .then(function(troupeIds) {
      return getUserMentionCountsForRooms(userId, troupeIds);
    });
}

function getUserMentionCountsForRooms(userId, troupeIds) {
  var multi = redisClient.multi();

  troupeIds.forEach(function(troupeId) {
    multi.scard("m:" + userId + ":" + troupeId);
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


engine.newItemWithMentions = newItemWithMentions;
engine.removeItem = removeItem;
engine.ensureAllItemsRead = ensureAllItemsRead;
engine.markItemsRead = markItemsRead;
engine.listTroupeUsersForEmailNotifications = listTroupeUsersForEmailNotifications;

engine.getUserUnreadCounts = getUserUnreadCounts;
engine.getUserUnreadCountsForRooms = getUserUnreadCountsForRooms;

engine.getUserMentionCounts = getUserMentionCounts;
engine.getUserMentionCountsForRooms = getUserMentionCountsForRooms;

engine.getUnreadItems = getUnreadItems;
engine.getUnreadItemsForUserTroupes = getUnreadItemsForUserTroupes;

engine.getAllUnreadItemCounts = getAllUnreadItemCounts;
engine.getRoomsMentioningUser = getRoomsMentioningUser;
engine.getBadgeCountsForUserIds = getBadgeCountsForUserIds;
engine.getRoomsCausingBadgeCount = getRoomsCausingBadgeCount;

module.exports = engine;
