/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var troupeService = require("./troupe-service");
var appEvents = require("../app-events");
var _ = require("underscore");
var redis = require("redis");
var winston = require("winston");
var redisClient = redis.createClient();

var kue = require('kue'),
    jobs = kue.createQueue();

var DEFAULT_ITEM_TYPES = ['file', 'chat', 'request'];

exports.startWorkers = function() {
  function republishUnreadItemCountForUserTroupeWorker(data, callback) {
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
  }

  jobs.process('republish-unread-item-count-for-user-troupe', 20, function(job, done) {
    republishUnreadItemCountForUserTroupeWorker(job.data, done);
  });
};

// TODO: come up with a way to limit the number of republishes happening per user
function republishUnreadItemCountForUserTroupe(userId, troupeId, callback) {
  jobs.create('republish-unread-item-count-for-user-troupe', {
    title: 'republishUnreadItemCountForUserTroupe',
    userId: userId,
    troupeId: troupeId
  }).attempts(1)
    .save(callback);
}

exports.newItem = function(troupeId, creatorUserId, itemType, itemId) {
  if(!troupeId) { winston.error("newitem failed. Troupe cannot be null"); return; }
  if(!itemType) { winston.error("newitem failed. itemType cannot be null"); return; }
  if(!itemId) { winston.error("newitem failed. itemId cannot be null"); return; }

  troupeService.findById(troupeId, function(err, troupe) {
    if(err) return winston.error("Unable to load troupeId " + troupeId, err);
    var userIds = troupe.getUserIds();

    var data = {};
    data[itemType] = [itemId];

      // multi chain with an individual callback
    var multi = redisClient.multi();
    userIds.forEach(function(userId) {
      if(!creatorUserId || (("" + userId) != ("" + creatorUserId))) {
        appEvents.newUnreadItem(userId, troupeId, data);

        multi.sadd("unread:" + itemType + ":" + userId + ":" + troupeId, itemId);
      }
    });

    multi.exec(function(err/*, replies*/) {
      if(err) winston.error("unreadItemService.newItem failed", err);

      userIds.forEach(function(userId) {
        republishUnreadItemCountForUserTroupe(userId, troupeId);
      });
    });

  });
};

exports.removeItem = function(troupeId, itemType, itemId) {
  troupeService.findById(troupeId, function(err, troupe) {
    if(err) return winston.error("Unable to load troupeId " + troupeId, err);

    var userIds = troupe.getUserIds();

    var data = {};
    data[itemType] = [itemId];

    var multi = redisClient.multi();
    var m2 = redisClient.multi();

    userIds.forEach(function(userId) {
      appEvents.unreadItemsRemoved(userId, troupeId, data);

      multi.srem("unread:" + itemType + ":" + userId + ":" + troupeId, itemId);
    });

    multi.exec(function(err/*, replies*/) {
      if(err) return winston.error("unreadItemService.removeItem failed", err);

      m2.exec(function(err/*, replies*/) {
        if(err) return winston.error(err);

        userIds.forEach(function(userId) {
          republishUnreadItemCountForUserTroupe(userId, troupeId);
        });

      });
    });

  });
};

exports.markItemsRead = function(userId, troupeId, items, callback) {

  appEvents.unreadItemsRemoved(userId, troupeId, items);

  var multi = redisClient.multi();

  // lrt stands for "last read time" - it's the last time a user read something
  multi.set("lrt:" + userId, Date.now());

  var keys = _.keys(items);
  keys.forEach(function(itemType) {
    var ids = items[itemType];

    ids.forEach(function(id) {
      multi.srem("unread:" + itemType + ":" + userId + ":" + troupeId, id);
    });
  });

  multi.exec(function(err/*, replies*/) {
    if(err) return callback(err);

    republishUnreadItemCountForUserTroupe(userId, troupeId);

    callback();
  });
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

exports.getUnreadItemsForUser = function(userId, troupeId, callback) {
  var multi = redisClient.multi();

  DEFAULT_ITEM_TYPES.forEach(function(itemType) {
    multi.smembers("unread:" + itemType + ":" + userId + ":" + troupeId);
  });

  multi.exec(function(err, replies) {
    var result = {};

    DEFAULT_ITEM_TYPES.forEach(function(itemType, index) {
      var reply = replies[index];
      result[itemType] = reply;
    });

    callback(null, result);
  });
};

/* TODO: make this better, more OO-ey */
function findCreatingUserIdModel(modelName, model) {
  switch(modelName) {
    case "file":
      return model.versions[model.versions.length - 1].creatorUser.id;

    case "chat":
      return model.fromUser.id;

    case "invite":
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

  if(model === 'chatMessages') {
    return {
      troupeId: match[1],
      modelName: 'chat'
    };
  }
  return null;
}

/* TODO: make sure only one of these gets installed for the whole app */
exports.installListener = function() {

  appEvents.localOnly.onDataChange2(function(data) {
    var url = data.url;
    var operation = data.operation;
    var model = data.model;
    var modelId = data.model.id;

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