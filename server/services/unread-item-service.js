/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService = require("./troupe-service");
var readByService = require("./readby-service");
var appEvents = require("../app-events");
var _ = require("underscore");
var redis = require("../utils/redis");
var winston = require("winston");
var redisClient = redis.createClient();
var mongoUtils = require('../utils/mongo-utils');
var Fiber = require('../utils/fiber');
var RedisBatcher = require('../utils/redis-batcher').RedisBatcher;
var badgeBatcher = new RedisBatcher('badge', 1000);
var Scripto = require('redis-scripto');
var scriptManager = new Scripto(redisClient);
scriptManager.loadFromDir(__dirname + '/../../redis-lua/unread');


var DEFAULT_ITEM_TYPES = ['file', 'chat', 'request'];

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

exports.newItem = function(troupeId, creatorUserId, itemType, itemId) {
  if(!troupeId) { winston.error("newitem failed. Troupe cannot be null"); return; }
  if(!itemType) { winston.error("newitem failed. itemType cannot be null"); return; }
  if(!itemId) { winston.error("newitem failed. itemId cannot be null"); return; }


  troupeService.findUserIdsForTroupe(troupeId, function(err, userIds) {
    if(err) return winston.error("Unable to load troupeId " + troupeId, err);

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
    scriptManager.run('unread-add-item', keys, [troupeId, itemId], function(err, updates) {
      if(err) return winston.error("unread-add-item failed" + err, { exception: err });

      userIds.forEach(function(userId) {
        republishUnreadItemCountForUserTroupe(userId, troupeId);
      });

      updates.forEach(function(update) {
        var userId = userIds[update];
        republishBadgeForUser(userId);
      });
    });

  });
};

exports.removeItem = function(troupeId, itemType, itemId) {
  if(!troupeId) { winston.error("newitem failed. Troupe cannot be null"); return; }
  if(!itemType) { winston.error("newitem failed. itemType cannot be null"); return; }
  if(!itemId) { winston.error("newitem failed. itemId cannot be null"); return; }


  troupeService.findUserIdsForTroupe(troupeId, function(err, userIds) {
    if(err) return winston.error("Unable to load troupeId " + troupeId, err);

    // Publish out an unread item removed event
    // TODO: we could actually check whether this user thinks this item is UNREAD
    var data = {};
    data[itemType] = [itemId];
    userIds.forEach(function(userId) {
      appEvents.unreadItemsRemoved(userId, troupeId, data);
    });

    // Now talk to redis and do the update
    var keys = getScriptKeysForUserIds(userIds, itemType, troupeId);
    scriptManager.run('unread-remove-item', keys, [troupeId, itemId], function(err, updates) {
      if(err) return winston.error("unread-remove-item failed" + err, { exception: err });

      userIds.forEach(function(userId) {
        republishUnreadItemCountForUserTroupe(userId, troupeId);
      });

      updates.forEach(function(update) {
        var userId = userIds[update];
        republishBadgeForUser(userId);
      });
    });

  });
};

function markItemsOfTypeRead(userId, troupeId, lrt, itemType, ids, callback) {
  var keys = [
      "lrt:" + userId,
      "ub:" + userId,
      "unread:" + itemType + ":" + userId + ":" + troupeId
    ];

  var values = [lrt, troupeId].concat(ids);

  scriptManager.run('unread-mark-items-read', keys, values, callback);
}

/**
 * Mark many items as read, for a single user and troupe
 */
exports.markItemsRead = function(userId, troupeId, items, callback) {
  var now = Date.now();

  appEvents.unreadItemsRemoved(userId, troupeId, items);

  var f = new Fiber();

  Object.keys(items).forEach(function(itemType) {
    var ids = items[itemType];
    markItemsOfTypeRead(userId, troupeId, now, itemType, ids, f.waitor());
  });

  f.all().then(function(results) {
    republishUnreadItemCountForUserTroupe(userId, troupeId);

    if(results.filter(function(i) { return i > 0; }).length > 0) {
      republishBadgeForUser(userId);
    }

    // For the moment, we're only bothering with chats for this
    readByService.recordItemsAsRead(userId, troupeId, items, function(err) {
      if(err) winston.error("Error while recording items as read: " + err, { exception: err });
      // Silently swallow the error!
      callback();
    });

  }, callback);

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

exports.getUnreadItems = function(userId, troupeId, itemType, callback) {
    redisClient.smembers("unread:" + itemType + ":" + userId + ":" + troupeId, function(err, members) {
      if(err) {
        winston.warn("unreadItemService.getUnreadItems failed", err);

        // Mask error
        return callback(null, []);
      }

      callback(null, members);
    });
};

exports.getUnreadItemsForUserTroupeSince = function(userId, troupeId, since, callback) {
  var f = new Fiber();
  exports.getUnreadItems(userId, troupeId, 'chat', f.waitor());
  exports.getUnreadItems(userId, troupeId, 'file', f.waitor());
  f.all().then(function(results) {
    var chatItems = results[0];
    var fileItems = results[1];

    chatItems = chatItems.filter(sinceFilter(since));
    fileItems = fileItems.filter(sinceFilter(since));

    var response = {};
    if(chatItems.length) {
      response.chat = chatItems;
    }
    if(fileItems.length) {
      response.file = fileItems;
    }

    callback(null,response);
  }, callback);
};

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

exports.getBadgeCountsForUserIds = function(userIds, callback) {
  var multi = redisClient.multi();

  userIds.forEach(function(userId) {
    multi.zcard("ub:" + userId);
  });

  multi.exec(function(err, replies) {
    if(err) return callback(err);

    var result = {};

    userIds.forEach(function(userId, index) {
      var reply = replies[index];
      result[userId] = reply;
    });

    callback(null, result);
  });
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
      return model.fromUser.id;

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
    var modelId = model.id;

    var info = generateNotificationForUrl(url);
    if(!info) {
      return;
    }

    if(operation === 'create') {
      var creatingUserId = findCreatingUserIdModel(info.modelName, model);
      exports.newItem(info.troupeId, creatingUserId, info.modelName, modelId);
    } else if(operation === 'remove') {
      exports.removeItem(info.troupeId, info.modelName, modelId);
    }

  });
};

exports.testOnly = {
  getOldestId: getOldestId,
  sinceFilter: sinceFilter
};