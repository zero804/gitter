/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService    = require("./troupe-service");
var readByService    = require("./readby-service");
var userService      = require("./user-service");
var roomPermissionsModel = require('./room-permissions-model');
var appEvents        = require("../app-events");
var _                = require("underscore");
var redis            = require("../utils/redis");
var winston          = require('../utils/winston');
var mongoUtils       = require('../utils/mongo-utils');
var RedisBatcher     = require('../utils/redis-batcher').RedisBatcher;
var Scripto          = require('redis-scripto');
var Q                = require('q');
var assert           = require('assert');
var redisClient      = redis.getClient();
var badgeBatcher     = new RedisBatcher('badge', 300);
var scriptManager    = new Scripto(redisClient);
scriptManager.loadFromDir(__dirname + '/../../redis-lua/unread');

var EMAIL_NOTIFICATION_HASH_KEY = "unread:email_notify";

function sinceFilter(since) {
  return function(id) {
    var date = mongoUtils.getDateFromObjectId(id);
    return date.getTime() >= since;
  };

}

badgeBatcher.listen(function(key, userIds, done) {
  // Remove duplicates
  userIds = _.uniq(userIds);

  // Get responders to respond
  appEvents.batchUserBadgeCountUpdate({
    userIds: userIds
  });

  done();
});

function republishBadgeForUser(userId) {
  badgeBatcher.add('queue', userId);
}

/**
 * Returns the key array used by the redis scripts
 */
function getScriptKeysForUserIds(userIds, itemType, troupeId) {
  var unreadKeys = userIds.map(function(userId) {
    return "unread:" + itemType + ":" + userId + ":" + troupeId;
  });

  var badgeKeys = userIds.map(function(userId) {
    return "ub:" + userId;
  });

  return unreadKeys.concat(badgeKeys);
}

var runScript = Q.nbind(scriptManager.run, scriptManager);
var redisClient_smembers = Q.nbind(redisClient.smembers, redisClient);

function upgradeKeyToSortedSet(key, userBadgeKey, troupeId, callback) {
  winston.verbose('unread-item-key-upgrade: attempting to upgrade ' + key);

  // Use a new client due to the WATCH semantics (don't use getClient!)
  var redisClient = redis.createClient();

  function done(err) {
    if(err) {
      winston.verbose('unread-item-key-upgrade: upgrade failed' + err, { exception: err });
    } else {
      winston.verbose('unread-item-key-upgrade: upgrade completed successfully');
    }

    redis.quit(redisClient);

    return callback(err);
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
      if(keyType != 'set') {
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

        multi.exec(function(err) {
          if(err) return done(err);
        });

      });


    });
  });


}

/**
 * New item added
 * @return {promise} promise of result from troupeService.findUserIdsForTroupeWithLurk(troupeId)
 *
 * Why return such an odd value? It's used by the next caller.
 */
function newItem(troupeId, creatorUserId, itemType, itemId) {
  function reject(msg) {
    winston.error(msg);
    return Q.reject(msg);
  }

  if(!troupeId) { return reject("newitem failed. Troupe cannot be null"); }
  if(!itemType) { return reject("newitem failed. itemType cannot be null");  }
  if(!itemId) { return reject("newitem failed. itemId cannot be null"); }

  return troupeService.findUserIdsForTroupeWithLurk(troupeId)
    .then(function(troupe) {
      var userIdsWithLurk = troupe.users;
      var userIds = Object.keys(userIdsWithLurk);

      if(creatorUserId) {
        userIds = userIds.filter(function(userId) {
          return ("" + userId) != ("" + creatorUserId);
        });
      }

      // Publish out an new item event
      var data = {};
      data[itemType] = [itemId];

      var userIdsForNotify = userIds.filter(function(u) {
        return !userIdsWithLurk[u];
      });

      // Send out troupe activity blink for lurking users
      userIds.forEach(function(u) {
        if(userIdsWithLurk[u]) {
          // Lurking, send them an activity "ping"
          appEvents.newLurkActivity({ userId: u, troupeId: troupeId });
        } else {
          // Not lurking, send them the full update
          appEvents.newUnreadItem(u, troupeId, data);
        }
      });

      if(!userIdsForNotify.length) return;

      return newItemForUsers(troupeId, itemType, itemId, userIdsForNotify)
        .thenResolve(troupe);
    });
}

function newItemForUsers(troupeId, itemType, itemId, userIds) {
  // Now talk to redis and do the update
  var keys = [EMAIL_NOTIFICATION_HASH_KEY].concat(getScriptKeysForUserIds(userIds, itemType, troupeId));
  var timestamp = mongoUtils.getTimestampFromObjectId(itemId);
  var values = [troupeId, itemId, timestamp].concat(userIds);

  return runScript('unread-add-item', keys, values)
    .then(function(result) {
      function logOptimisticUpgradeFailure(err) {
        if(err) {
          winston.info('unread-item-key-upgrade: failed. This is not as serious as it sounds, optimistically locked. ' + err, { exception: err });
        }
      }

      // Results come back as two items per key in sequence
      // * 2*n value is the new badge count (or -1 for don't update)
      // * 2*n+1 value is a bitwise collection, 1 = badge update, 2 = upgrade key
      for(var i = 0; i < result.length; i = i + 2) {
        var troupeUnreadCount   = result[i];
        var flag                = result[i + 1];
        var badgeUpdate         = flag & 1;
        var upgradeKey          = flag & 2;
        var userId              = userIds[i >> 1];

        if(troupeUnreadCount >= 0) {
          // Notify the user
          appEvents.troupeUnreadCountsChange({
            userId: userId,
            troupeId: troupeId,
            total: troupeUnreadCount
          });
        }

        if(badgeUpdate) {
          republishBadgeForUser(userId);
        }

        if(upgradeKey) {
          var key = "unread:" + itemType + ":" + userId + ":" + troupeId;
          var userBadgeKey = "ub:" + userId;

          // Upgrades can happen asynchoronously
          upgradeKeyToSortedSet(key, userBadgeKey, troupeId, logOptimisticUpgradeFailure);
        }
      }

    });


}

/**
 * Item removed
 * @return {promise} promise of nothing
 */
function removeItem(troupeId, itemType, itemId) {
  if(!troupeId) { winston.error("newitem failed. Troupe cannot be null"); return; }
  if(!itemType) { winston.error("newitem failed. itemType cannot be null"); return; }
  if(!itemId) { winston.error("newitem failed. itemId cannot be null"); return; }

  return troupeService.findUserIdsForTroupeWithLurk(troupeId)
    .then(function(troupe) {
      var userIdsWithLurk = troupe.users;
      var userIds = Object.keys(userIdsWithLurk);

      // Publish out an unread item removed event
      // TODO: we could actually check whether this user thinks this item is UNREAD
      var data = {};
      data[itemType] = [itemId];
      userIds.forEach(function(userId) {
        appEvents.unreadItemsRemoved(userId, troupeId, data);
      });

      var userIdsForNotify = userIds.filter(function(u) {
        return !userIdsWithLurk[u];
      });

      if(!userIdsForNotify.length) return;

      var keys = userIdsForNotify.reduce(function(memo, userId) {
          memo.push(
            "unread:" + itemType + ":" + userId + ":" + troupeId,     // Unread for user
            "ub:" + userId,                                           // Unread badge for user
            "m:" + userId + ":" + troupeId,                           // User Troupe mention items
            "m:" + userId                                             // User mentions
          );

          return memo;
        }, []);

      return runScript('unread-remove-item', keys, [troupeId, itemId])
        .then(function(result) {
          // Results come back as three items per key in sequence
          for(var i = 0; result.length > 0; i++) {
            var troupeUnreadCount   = result.shift();
            var flag                = result.shift();
            var removedLastMention  = result.shift();

            var badgeUpdate         = flag & 1;
            var userId              = userIdsForNotify[i];

            if(troupeUnreadCount >= 0) {
              // Notify the user. If the unread count is zero,
              // the client should zero out it's
              appEvents.troupeUnreadCountsChange({
                userId: userId,
                troupeId: troupeId,
                total: troupeUnreadCount
              });
            }

            if(removedLastMention) {
              // Notify the user
              appEvents.troupeMentionCountsChange({
                userId: userId,
                troupeId: troupeId,
                total: 0,
                op: 'remove',
                member: true // XXX: may not always be the case
              });
            }

            if(badgeUpdate) {
              republishBadgeForUser(userId);
            }
          }

        });

  });
}

/**
 * Mark an item in a troupe as having been read by a user
 * @return {promise} promise of nothing
 */
function markItemsOfTypeRead(userId, troupeId, itemType, ids, member) {
  assert(userId, 'Expected userId');
  assert(troupeId, 'Expected troupeId');
  assert(itemType, 'Expected itemType');

  if(!ids.length) return; // Nothing to do

  var keys = [
      "ub:" + userId,
      "unread:" + itemType + ":" + userId + ":" + troupeId,
      EMAIL_NOTIFICATION_HASH_KEY,
      "m:" + userId + ":" + troupeId,
      "m:" + userId,
      'uel:' + troupeId + ":" + userId
    ];

  var values = [troupeId, userId].concat(ids);

  return runScript('unread-mark-items-read', keys, values)
    .then(function(result) {
      var troupeUnreadCount   = result[0];
      var flag                = result[1];
      var badgeUpdate         = flag & 1;

      if(troupeUnreadCount >= 0) {
        // Notify the user
        appEvents.troupeUnreadCountsChange({
          userId: userId,
          troupeId: troupeId,
          total: troupeUnreadCount
        });

        if(troupeUnreadCount === 0) {
          // Notify the user
          appEvents.troupeMentionCountsChange({
            userId: userId,
            troupeId: troupeId,
            total: 0,
            op: 'remove',
            member: member
          });
        }
      }

      if(badgeUpdate) {
        republishBadgeForUser(userId);
      }
    });
}

/**
 * Mark an item in a troupe as having been read by a user
 * @return {promise} promise of nothing
 */
function setLastReadTimeForUser(userId, troupeId, lastReadTimestamp) {
  assert(userId, 'Expected userId');
  assert(lastReadTimestamp, 'Expected lastReadTimestamp');

  return Q.ninvoke(redisClient, "mset",
    "lrt:" + userId, lastReadTimestamp,
    "lrtt:" + userId + ":" + troupeId, lastReadTimestamp);
}

/**
 * Returns a hash of hash {user:troupe:ids} of users who have
 * outstanding notifications since before the specified time
 * @return a promise of hash
 */
exports.listTroupeUsersForEmailNotifications = function(horizonTime, emailLatchExpiryTimeS) {
  return Q.ninvoke(redisClient, "hgetall", EMAIL_NOTIFICATION_HASH_KEY)
    .then(function(troupeUserHash) {
      if (!troupeUserHash) return {};

      /* Filter out values which are too recent */
      var filteredKeys = Object.keys(troupeUserHash).filter(function(key) {
        var value = troupeUserHash[key];
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

          var result = {};

          /* Remove items that have an email latch on */
          var promises = filteredKeys.filter(function(value, i) {
            return results[i];
          }).map(function(key) {
            var troupeUserId = key.split(':');
            var troupeId = troupeUserId[0];
            var userId = troupeUserId[1];

            return getUnreadItemsForUserTroupeSince(userId, troupeId, 0/* time */)
              .then(function(items) {
                if(items && items.chat && items.chat.length) {
                  var v = result[userId];
                  if(!v) {
                    v = { };
                    result[userId] = v;
                  }

                  v[troupeId] = items && items.chat;
                }
              });
          });

          return Q.all(promises)
            .then(function() {
              return result;
            });

        });

    });
};

/**
 * Mark many items as read, for a single user and troupe
 */
exports.markItemsRead = function(userId, troupeId, itemIds, mentionIds, options) {
  // Configure options
  if(!options) options = {};

  // { member : default true }
  if(options.member === undefined) options.member = true;

  // { recordAsRead: default true }
  if(options.recordAsRead === undefined) options.recordAsRead = true;

  var now = Date.now();

  var allIds = [];

  if(itemIds) allIds = allIds.concat(itemIds);
  if(mentionIds) allIds = allIds.concat(mentionIds);

  appEvents.unreadItemsRemoved(userId, troupeId, { chat: itemIds }); // TODO: update

  return Q.all([
    markItemsOfTypeRead(userId, troupeId, 'chat', allIds, options.member),
    setLastReadTimeForUser(userId, troupeId, now),
    mentionIds && mentionIds.length && removeMentionForUser(userId, troupeId, mentionIds, options.member)
    ])
    .then(function() {
      if(!options.recordAsRead) {
        return;
      }

      // For the moment, we're only bothering with chats for this
      return readByService.recordItemsAsRead(userId, troupeId, { chat: allIds }); // TODO: drop the hash
    });

};

exports.markAllChatsRead = function(userId, troupeId, options) {
  if(!options) options = {};
  appEvents.markAllRead({ userId: userId, troupeId: troupeId });

  return exports.getUnreadItems(userId, troupeId, 'chat')
    .then(function(chatIds) {
      if(!chatIds.length) return;

      if(!('recordAsRead' in options)) options.recordAsRead = false;
      /* Don't mark the items as read */
      return exports.markItemsRead(userId, troupeId, chatIds, null, options);
    });
};

exports.getUserUnreadCounts = function(userId, troupeId, callback) {
  var key = "unread:chat:" + userId + ":" + troupeId;
  return runScript('unread-item-count', [key], [])
    .then(function(result) {
      return result || 0;
    })
    .nodeify(callback);
};

exports.getUserUnreadCountsForTroupeIds = function(userId, troupeIds, callback) {

  var keys = troupeIds.map(function(troupeId) {
    return "unread:chat:" + userId + ":" + troupeId;
  });

  return runScript('unread-item-count', keys, [])
    .then(function(replies) {
      return troupeIds.reduce(function(memo, troupeId, index) {
        memo[troupeId] = replies[index];
        return memo;
      }, {});

    })
    .nodeify(callback);
};

exports.getUserMentionCountsForTroupeIds = function(userId, troupeIds, callback) {
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

  return d.promise.nodeify(callback);
};

/** Returns hash[userId] = unixTime for each of the queried users */
exports.findLastReadTimesForUsers = function(userIds, callback) {
  var keysToQuery = userIds.map(function(userId) { return "lrt:" + userId;});
  redisClient.mget(keysToQuery, function(err, times) {
    if(err) return callback(err);
    var result = {};
    times.forEach(function(time, index) {
      if(time) {
        var userId = userIds[index];
        result[userId] = time;
      }
    });

    callback(null, result);
  });
};

/** Returns hash[userId] = unixTime for each of the queried users */
exports.findLastReadTimesForUsersForTroupe = function(userIds, troupeId, callback) {
  var keysToQuery = userIds.map(function(userId) { return "lrtt:" + userId + ":" + troupeId;});
  redisClient.mget(keysToQuery, function(err, times) {
    if(err) return callback(err);
    var result = {};
    times.forEach(function(time, index) {
      if(time) {
        var userId = userIds[index];
        result[userId] = time;
      }
    });

    callback(null, result);
  });
};


exports.getUnreadItems = function(userId, troupeId, itemType, callback) {
  var keys = ["unread:" + itemType + ":" + userId + ":" + troupeId];
  return runScript('unread-item-list', keys, [])
    .fail(function(err) {
      winston.warn("unreadItemService.getUnreadItems failed:" + err, { exception: err });
      // Mask error
      return [];
    })
    .nodeify(callback);
};

exports.getRoomIdsMentioningUser = function(userId, callback) {
  return redisClient_smembers("m:" + userId)
    .fail(function(err) {
      winston.warn("unreadItemService.getRoomIdsMentioningUser failed:" + err, { exception: err });
      // Mask error
      return [];
    })
    .nodeify(callback);
};

function getUnreadItemsForUserTroupeSince(userId, troupeId, since, callback) {
  return exports.getUnreadItems(userId, troupeId, 'chat')
    .then(function(chatItems) {
      chatItems = chatItems.filter(sinceFilter(since));

      var response = {};
      if(chatItems.length) {
        response.chat = chatItems;
      }

      return response;
    })
    .nodeify(callback);
}

exports.getUnreadItemsForUserTroupeSince = getUnreadItemsForUserTroupeSince;

exports.getFirstUnreadItem = function(userId, troupeId, itemType, callback) {
  exports.getUnreadItems(userId, troupeId, itemType, function(err, members) {
    if(err) {
      winston.warn("unreadItemService.getUnreadItems failed: " + err, { exception: err });

      // Mask error
      return callback(null, null);
    }

    var totalUnreadItems = members.length;
    var minId = getOldestId(members);

    return callback(null, minId, totalUnreadItems);
  });
};

exports.getUnreadItemsForUser = function(userId, troupeId, callback) {
  return exports.getUnreadItems(userId, troupeId, 'chat')
    .then(function(results) {
      return {
        chat: results
      };
    })
    .nodeify(callback);
};

/**
 * Get the badge counts for userIds
 * @return promise of a hash { userId1: 1, userId: 2, etc }
 */
exports.getBadgeCountsForUserIds = function(userIds, callback) {
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

  return d.promise.nodeify(callback);
};

function getOldestId(ids) {
  if(!ids.length) return null;

  return _.min(ids, function(id) {
    // Create a new ObjectID with a specific timestamp
    return mongoUtils.getTimestampFromObjectId(id);
  });
}


/**
 * New item added
 * @return {promise} promise of nothing
 */
function newMention(troupeId, chatId, userIds, usersHash) {
  if(!troupeId) { winston.error("newMention failed. Troupe cannot be null"); return Q.resolve(); }
  if(!chatId) { winston.error("newMention failed. itemId cannot be null"); return Q.resolve(); }

  if(!userIds.length) return;


  var unreadKeys = userIds.map(function(userId) {
    return "m:" + userId + ":" + troupeId;
  });

  var badgeKeys = userIds.map(function(userId) {
    return "ub:" + userId;
  });

  var userMentionKeys = userIds.map(function(userId) {
    return "m:" + userId;
  });

  var keys = unreadKeys.concat(badgeKeys, userMentionKeys);

  return runScript('unread-add-mentions', keys, [chatId, troupeId])
    .then(function(result) {
      // Results come back as two items per key in sequence
      // * 2*n value is the new user troupe count (or -1 for don't update)
      // * 2*n+1 value is a flag. 0 = nothing, 1 = update badge
      for(var i = 0; i < result.length; i++) {
        var mentionCount        = result[i];
        var userId              = userIds[i];

        if(mentionCount >= 0) {
          // Notify the user
          appEvents.troupeMentionCountsChange({
            userId: userId,
            troupeId: troupeId,
            total: mentionCount,
            op: 'add',
            member: userId in usersHash /* See bayeux-events-bridge for why we need this  */
          });
        }
      }

      // TODO: email users about their mentions.. Look at newItem
    });
}

/**
 * Remove the mentions and decrement counters. This will be called when a user reads an item
 */
function removeMentionForUser(userId, troupeId, itemIds, member) {
  if(!itemIds.length) return;
  var keys = [
      "m:" + userId + ":" + troupeId, // User troupe mention
      "m:" + userId                   // User mention badge
    ];

  var values = [troupeId].concat(itemIds);
  return runScript('unread-remove-user-mentions', keys, values)
    .then(function(mentionCount) {
      if(mentionCount >= 0) {
        // Notify the user
        appEvents.troupeMentionCountsChange({
          userId: userId,
          troupeId: troupeId,
          total: mentionCount,
          op: 'remove',
          member: member
        });
      }
    });


}

function getTroupeIdsCausingBadgeCount(userId, callback) {
  return Q.ninvoke(redisClient, "zrange", ["ub:" + userId, 0, -1])
    .nodeify(callback);
}

function getTroupeIdsWithUnreadChats(userId, callback) {
  return Q.ninvoke(redisClient, 'keys', 'unread:chat:' + userId + ':*')
    .then(function(keys) {
      var troupeIds = keys.map(function(key) {
        return key.split(':')[3];
      });
      return troupeIds;
    })
    .nodeify(callback);
}

/**
 * Returns a promise of nothing
 */
function detectAndCreateMentions(troupeId, troupe, creatingUserId, chat) {
  if(!chat.mentions || !chat.mentions.length) return Q.resolve();

  /* Figure out what type of room this is */
  var oneToOne = troupe.githubType === 'ONETOONE';

  var usersHash = troupe.users;
  if(!usersHash) return;

  var userIds = chat.mentions
        .filter(function(mention) {
          // Only use this for people mentions
          return mention.userId && !mention.group;
        })
        .map(function(mention) {
          return mention.userId;
        });

  // Handle all group with a special-case
  // In future, resolve this against github teams
  var allGroupMention = chat.mentions
        .filter(function(mention) {
          // Only use this for people mentions
          return mention.group && mention.screenName === 'all';
        }).length >= 1;

  var mentionMemberUserIds;
  if(allGroupMention) {
    // Add everyone except the person creating the message
    mentionMemberUserIds = Object.keys(usersHash).filter(function(u) {
      return "" + u !== "" + creatingUserId;
    });
  } else {
    mentionMemberUserIds = [];
  }

  var mentionLurkerAndNonMemberUserIds = [];

  var lookupUsers = [];

  userIds.forEach(function(userId) {
    if(!userId) return;

    /* Don't be mentioning yourself yo */
    if(userId == creatingUserId) return;

    if(userId in usersHash) {
      var lurk = usersHash[userId];

      /* User is in the room? Always mention */
      if(lurk) {
        mentionLurkerAndNonMemberUserIds.push(userId);
      } else {
        mentionMemberUserIds.push(userId);
      }
      return;
    }

    if(!oneToOne) {
      /* We'll need to use the permissions-model to determine if they'll be allowed in */
      lookupUsers.push(userId);
    }

  });

  var lookup;
  if(lookupUsers.length) {
    lookup = userService.findByIds(lookupUsers);
  } else {
    lookup = Q.resolve([]);
  }

  return lookup.then(function(users) {
    if(!users.length) return;

    return Q.all(users.map(function(user) {
      return roomPermissionsModel(user, 'join', troupe)
        .then(function(access) {
          if(access) {
            mentionLurkerAndNonMemberUserIds.push(user.id);
          }

        });
    }));

  }).then(function() {
    /**
     * Lurkers and non members wont have an unread item, so the first thing
     * we'll need to do is create an unread item for them. Only then can we push the
     * mention
     */
    if(mentionLurkerAndNonMemberUserIds.length) {
      return newItemForUsers(troupeId, 'chat', chat.id, mentionLurkerAndNonMemberUserIds)
        .then(function() {
          var allUserIds = mentionLurkerAndNonMemberUserIds.concat(mentionMemberUserIds);
          return newMention(troupeId, chat.id, allUserIds, usersHash);
        })
        .then(function() {
          var data = {
            chat: [chat.id]
          };

          mentionLurkerAndNonMemberUserIds.forEach(function(userId) {
            // Lurkers never recieved a newUnreadItem. Send it to them
            appEvents.newUnreadItem(userId, troupeId, data);
          });
        });
    } else {
      return newMention(troupeId, chat.id, mentionMemberUserIds, usersHash);
    }
  });

}

function detectAndRemoveMentions(troupeId, creatingUserId, chat) {
  if(!chat.mentions) return;
  // XXX: remove the mention
}

exports.install = function() {

  appEvents.localOnly.onChat(function(data) {
    var operation = data.operation;
    var troupeId = data.troupeId;
    var model = data.model;

    if(!model) {
      winston.warn('No data model in onDataChangeEvent', { data: data});
      return;
    }

    var modelId = model.id;
    var creatingUserId = model.fromUser && model.fromUser.id;
    var promise;

    if(operation === 'create') {
      promise = newItem(troupeId, creatingUserId, 'chat', modelId)
        .then(function(troupe) {
          return detectAndCreateMentions(troupeId, troupe, creatingUserId, model);
        });

    } else if(operation === 'remove') {
      promise = removeItem(troupeId, 'chat', modelId)
        .then(function() {
          return detectAndRemoveMentions(troupeId, creatingUserId, model);
        });
    }

    if(promise) {
      promise.catch(function(err) {
        winston.error('unreadItemService failure: ' + err, { exception: err });
        throw err;
      });
    }

  });
};

exports.testOnly = {
  getOldestId: getOldestId,
  sinceFilter: sinceFilter,
  newItem: newItem,
  removeItem: removeItem,
  newItemForUsers: newItemForUsers,
  detectAndCreateMentions: detectAndCreateMentions,
  getTroupeIdsCausingBadgeCount: getTroupeIdsCausingBadgeCount,
  getTroupeIdsWithUnreadChats: getTroupeIdsWithUnreadChats

};
