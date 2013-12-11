/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService = require("./troupe-service");
var readByService = require("./readby-service");
var appEvents     = require("../app-events");
var _             = require("underscore");
var redis         = require("../utils/redis");
var winston       = require("winston");
var mongoUtils    = require('../utils/mongo-utils');
var RedisBatcher  = require('../utils/redis-batcher').RedisBatcher;
var Scripto       = require('redis-scripto');
var Q             = require('q');
var assert        = require('assert');


var redisClient   = redis.createClient();
var badgeBatcher  = new RedisBatcher('badge', 300);
var scriptManager = new Scripto(redisClient);

scriptManager.loadFromDir(__dirname + '/../../redis-lua/unread');

var EMAIL_NOTIFICATION_HASH_KEY = "unread:email_notify";

var DEFAULT_ITEM_TYPES = ['chat', 'request'];

function sinceFilter(since) {
  return function(id) {
    var date = mongoUtils.getDateFromObjectId(id);
    return date.getTime() >= since;
  };

}

var workerQueue = require('../utils/worker-queue');

var queue = workerQueue.queue('republish-unread-item-count-for-user-troupe', {}, function() {
  return function republishUnreadItemCountForUserTroupeWorker(data, callback) {
    var userId = data.userId;
    var troupeId = data.troupeId;

    exports.getUserUnreadCounts(userId, troupeId, function(err, counts) {
      if(err) return callback(err);

      // Notify the user
      appEvents.troupeUnreadCountsChange({
        userId: userId,
        troupeId: troupeId,
        counts: counts
      });

      return callback();
    });
  };
});

// TODO: come up with a way to limit the number of republishes happening per user
function republishUnreadItemCountForUserTroupe(userId, troupeId, callback) {
  queue.invoke({
    userId: userId,
    troupeId: troupeId
  }, callback);
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

/**
 * New item added
 * @return {promise} promise of nothing
 */
function newItem(troupeId, creatorUserId, itemType, itemId) {
  if(!troupeId) { winston.error("newitem failed. Troupe cannot be null"); return; }
  if(!itemType) { winston.error("newitem failed. itemType cannot be null"); return; }
  if(!itemId) { winston.error("newitem failed. itemId cannot be null"); return; }

  return troupeService.findUserIdsForTroupeIncludingDeactivated(troupeId)
    .then(function(userIds) {
      if(creatorUserId) {
        userIds = userIds.filter(function(userId) {
          return ("" + userId) != ("" + creatorUserId);
        });
      }

      // Publish out an new item event
      var data = {};
      data[itemType] = [itemId];
      userIds.forEach(function(userId) {
        appEvents.newUnreadItem(userId, troupeId, data);
      });

      // Now talk to redis and do the update
      var keys = getScriptKeysForUserIds(userIds, itemType, troupeId);
      return runScript('unread-add-item', keys, [troupeId, itemId])
        .then(function(updates) {
          userIds.forEach(function(userId) {
            republishUnreadItemCountForUserTroupe(userId, troupeId);
          });

          updates.forEach(function(update) {
            var userId = userIds[update];
            republishBadgeForUser(userId);
          });

          /**
           * Put these users on a list of people who may need a reminder email
           * at a later stage
           */
          var timestamp = mongoUtils.getTimestampFromObjectId(itemId);
          markUsersForEmailNotification(troupeId, userIds, timestamp);
        });

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

  return troupeService.findUserIdsForTroupe(troupeId)
    .then(function(userIds) {

      // Publish out an unread item removed event
      // TODO: we could actually check whether this user thinks this item is UNREAD
      var data = {};
      data[itemType] = [itemId];
      userIds.forEach(function(userId) {
        appEvents.unreadItemsRemoved(userId, troupeId, data);
      });

      // Now talk to redis and do the update
      var keys = getScriptKeysForUserIds(userIds, itemType, troupeId);
      return runScript('unread-remove-item', keys, [troupeId, itemId])
        .then(function(updates) {
          userIds.forEach(function(userId) {
            republishUnreadItemCountForUserTroupe(userId, troupeId);
          });

          updates.forEach(function(update) {
            var userId = userIds[update];
            republishBadgeForUser(userId);
          });
        });

  });
}

/**
 * Mark an item in a troupe as having been read by a user
 * @return {promise} promise of nothing
 */
function markItemsOfTypeRead(userId, troupeId, itemType, ids) {
  assert(userId, 'Expected userId');
  assert(troupeId, 'Expected troupeId');
  assert(itemType, 'Expected itemType');

  if(!ids.length) return; // Nothing to do

  var keys = [
      "ub:" + userId,
      "unread:" + itemType + ":" + userId + ":" + troupeId,
      EMAIL_NOTIFICATION_HASH_KEY
    ];

  var values = [troupeId, userId].concat(ids);

  return runScript('unread-mark-items-read', keys, values);
}

function markUsersForEmailNotification(troupeId, userIds, dateNow) {
  var values = [dateNow];
  values.push.apply(values, userIds.map(function(f) { return troupeId + ':' + f; }));

  return runScript('unread-mark-users-for-email', [EMAIL_NOTIFICATION_HASH_KEY], values)
  .fail(function(err) {
    winston.error('unread-mark-users-for-email failed:' + err, { exception: err });
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
exports.listTroupeUsersForEmailNotifications = function(sinceTime) {
  return Q.ninvoke(redisClient, "hgetall", EMAIL_NOTIFICATION_HASH_KEY)
    .then(function(troupeUserHash) {
      var result = {};

      if (!troupeUserHash) return result;

      var promises = Object.keys(troupeUserHash)
        .map(function(key) {
          var troupeUserId = key.split(':');
          var time = parseInt(troupeUserHash[key], 10);

          var troupeId = troupeUserId[0];
          var userId = troupeUserId[1];

          /* Its got to be older that the start time */
          if(time <= sinceTime) {

            return getUnreadItemsForUserTroupeSince(userId, troupeId, time)
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
          }
        });

      return Q.all(promises)
        .then(function() {
          return result;
        });
    });
};

exports.markUserAsEmailNotified = function(userId) {
  // NB: this function is not atomic, but it doesn't need to be
  return Q.ninvoke(redisClient, "hgetall", EMAIL_NOTIFICATION_HASH_KEY)
    .then(function(troupeUserHash) {
      return Object.keys(troupeUserHash)
        .filter(function(hashKey) {
          var troupeUserId = hashKey.split(':');
          var hashUserId = troupeUserId[1];
          return hashUserId == userId;
        });
    })
    .then(function(userTroupeKeys) {
      var args =[EMAIL_NOTIFICATION_HASH_KEY];
      args.push.apply(args, userTroupeKeys);

      return Q.npost(redisClient, "hdel", args);

    });
};

/**
 * Mark many items as read, for a single user and troupe
 */
exports.markItemsRead = function(userId, troupeId, items, callback) {
  var now = Date.now();

  appEvents.unreadItemsRemoved(userId, troupeId, items);

  var ops = Object.keys(items).map(function(itemType) {
      var ids = items[itemType];
      return markItemsOfTypeRead(userId, troupeId, itemType, ids);
    });

  // Also set the timestamp for the user
  ops.push(setLastReadTimeForUser(userId, troupeId, now));

  return Q.all(ops)
    .then(function(results) {
      republishUnreadItemCountForUserTroupe(userId, troupeId);

      var resultsRequiringBadgeCounts = results.filter(function(result, i) {
        return result > 0 && i != results.length - 1;
      });

      if(resultsRequiringBadgeCounts.length > 0) {
        republishBadgeForUser(userId);
      }

      // For the moment, we're only bothering with chats for this
      return readByService.recordItemsAsRead(userId, troupeId, items);
    })
    .nodeify(callback);

};

exports.getUserUnreadCounts = function(userId, troupeId, callback) {
  var multi = redisClient.multi();

  DEFAULT_ITEM_TYPES.forEach(function(itemType) {
    multi.scard("unread:" + itemType + ":" + userId + ":" + troupeId);
  });

  multi.exec(function(err, replies) {
    if(err) {
      winston.error("unreadItemService.getUserUnreadCounts failed", err);
      return callback(err);
    }

    var result = {};

    DEFAULT_ITEM_TYPES.forEach(function(itemType, index) {
      var reply = replies[index];
      result[itemType] = reply;
    });

    callback(null, result);

  });
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
  return redisClient_smembers("unread:" + itemType + ":" + userId + ":" + troupeId)
    .fail(function(err) {
      winston.warn("unreadItemService.getUnreadItems failed", err);
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
        winston.warn("unreadItemService.getUnreadItems failed", err);

        // Mask error
        return callback(null, null);
      }

      var totalUnreadItems = members.length;
      var minId = getOldestId(members);

      return callback(null, minId, totalUnreadItems);

    });
};

exports.getUnreadItemsForUser = function(userId, troupeId, callback) {
  var multi = redisClient.multi();

  DEFAULT_ITEM_TYPES.forEach(function(itemType) {
    multi.smembers("unread:" + itemType + ":" + userId + ":" + troupeId);
  });

  multi.exec(function(err, replies) {
    if(err) return callback(err);

    var result = {};

    DEFAULT_ITEM_TYPES.forEach(function(itemType, index) {
      var reply = replies[index];
      result[itemType] = reply;
    });

    callback(null, result);
  });
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

/* TODO: make this better, more OO-ey */
function findCreatingUserIdModel(modelName, model) {
  switch(modelName) {
    case "file":
      var current = model.versions[model.versions.length - 1];
      if(!current) return null;
      if(!current.creatorUser) return null;
      return current.creatorUser.id;

    case "chat":
      var id = model.fromUser ? model.fromUser.id : null;
      return id;

    case "request":
      return null;

    default:
      winston.warn("unread-items: unknown model type", { modelName: modelName });
      return null;
  }
}

// TODO: Sort this out!
function generateNotificationForUrl(url) {
  var match = /^\/troupes\/(\w+)\/(\w+)$/.exec(url);
  if(!match) return null;

  var model = match[2];

  if(model === 'files') {
   return {
      troupeId: match[1],
      modelName: 'file'
    };
  }

  if(model === 'requests') {
   return {
      troupeId: match[1],
      modelName: 'request'
    };
  }

  if(model === 'chatMessages') {
    return {
      troupeId: match[1],
      modelName: 'chat'
    };
  }
  return null;
}

function getOldestId(ids) {
  if(!ids.length) return null;

  return _.min(ids, function(id) {
    // Create a new ObjectID with a specific timestamp
    return mongoUtils.getTimestampFromObjectId(id);
  });
}

exports.install = function() {

  appEvents.localOnly.onDataChange2(function(data) {
    var url = data.url;
    var operation = data.operation;
    var model = data.model;

    if(!model) {
      winston.warn('No data model in onDataChangeEvent', { data: data});
      return;
    }

    if(model.skipAlerts) {
      winston.warn('model is set to skipAlerts', { data: data});
      return;
    }

    if(model.fileName) {
      winston.warn('Not generating unread items for files', {data: data});
      return;
    }

    var modelId = model.id;

    var info = generateNotificationForUrl(url);
    if(!info) {
      return;
    }

    var promise;

    if(operation === 'create') {
      var creatingUserId = findCreatingUserIdModel(info.modelName, model);
      promise = newItem(info.troupeId, creatingUserId, info.modelName, modelId);
    } else if(operation === 'remove') {
      promise = removeItem(info.troupeId, info.modelName, modelId);
    }

    if(promise) {
      promise.fail(function(err) {
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
  removeItem: removeItem
};
