/*jshint globalstrict:true, trailing:false unused:true node:true*/
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("./troupe-service");
var appEvents = require("../app-events");
var _ = require("underscore");
var redis = require("redis");
var winston = require("winston");
var redisClient = redis.createClient();

var DEFAULT_ITEM_TYPES = ['file', 'chat', 'request'];
var RECALC_WORK_SET_NAME = 'unread-item-recalc-set';
var RECALC_WORK_PUB_QUEUE = 'unread-item-recalc-set';

function doRecalculationWork() {
  redisClient.spop(RECALC_WORK_SET_NAME, function(err, value) {
    if(err) return winston.error(err);
    if(!value) {
      winston.info("All recalculations complete");
      return;
    }

    var a = value.split(":");
    if(a.length == 2) {
      var userId = a[0];
      var troupeId = a[1];

      getUserUnreadCounts(userId, troupeId, function(err, counts) {

        // Notify the user
        appEvents.troupeUnreadCountsChange({
          userId: userId,
          troupeId: troupeId,
          counts: counts
        });

      });
    }

    // Do the next bit of work
    doRecalculationWork();
  });
}

appEvents.onUnreadRecalcRequired(function() {
  doRecalculationWork();
});

function publishRecountNotification() {
  appEvents.unreadRecalcRequired();
}

function newItem(troupeId, creatorUserId, itemType, itemId) {
  troupeService.findById(troupeId, function(err, troupe) {
    if(err) return winston.error("Unable to load troupeId " + troupeId, err);
    var userIds = troupe.users;

    var data = {};
    data[itemType] = [itemId];

      // multi chain with an individual callback
    var multi = redisClient.multi();
    userIds.forEach(function(userId) {
      if(!creatorUserId || userId != creatorUserId) {
        appEvents.newUnreadItem(userId, troupeId, data);

        multi.sadd("unread:" + itemType + ":" + userId + ":" + troupeId, itemId);
      } else{
        winston.info("Not sending to " + userId, creatorUserId);
      }
    });

    multi.exec(function(err, replies) {
      if(err) winston.error("unreadItemService.newItem failed", err);
      publishRecountNotification();
    });

  });
}

function removeItem(troupeId, itemType, itemId) {
  troupeService.findById(troupeId, function(err, troupe) {
    if(err) return winston.error("Unable to load troupeId " + troupeId, err);

    var userIds = troupe.users;

    var data = {};
    data[itemType] = [itemId];

    var multi = redisClient.multi();
    var m2 = redisClient.multi();

    userIds.forEach(function(userId) {
      appEvents.unreadItemsRemoved(userId, troupeId, data);

      multi.srem("unread:" + itemType + ":" + userId + ":" + troupeId, itemId);
    });

    multi.exec(function(err, replies) {
      if(err) return winston.error("unreadItemService.removeItem failed", err);

      m2.exec(function(err, replies) {
        if(err) return winston.error(err);

        publishRecountNotification();
      });
    });

  });
}

function markItemsRead(userId, troupeId, items, callback) {

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

  multi.exec(function(err, replies) {
    if(err) return callback(err);

    publishRecountNotification();

    callback();
  });
}

function getUserUnreadCounts(userId, troupeId, callback) {
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
}

/** Returns hash[userId] = unixTime for each of the queried users */
function findLastReadTimesForUsers(userIds, callback) {
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
}

function getUnreadItems(userId, troupeId, itemType, callback) {
    redisClient.smembers("unread:" + itemType + ":" + userId + ":" + troupeId, function(err, members) {
      if(err) {
        winston.warn("unreadItemService.getUnreadItems failed", err);

        // Mask error
        return callback(null, []);
      }

      callback(null, members);
    });
}

function getUnreadItemsForUser(userId, troupeId, callback) {
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
}

/* TODO: make this better, more OO-ey */
function findCreatingUserIdModel(modelName, model) {

  switch(modelName) {
    case "file":
      return model.versions[model.versions.length - 1].creatorUserId;

    case "chat":
      return model.fromUserId;

    case "invite":
    case "request":
      return null;

    default:
      winston.warn("unread-items: unknown model type", { modelName: modelName });
      return null;
  }
}

module.exports = {
  newItem: newItem,
  removeItem: removeItem,
  markItemsRead: markItemsRead,
  getUnreadItems: getUnreadItems,
  getUserUnreadCounts: getUserUnreadCounts,
  getUnreadItemsForUser: getUnreadItemsForUser,
  findLastReadTimesForUsers: findLastReadTimesForUsers,

  /* TODO: make sure only one of these gets installed for the whole app */
  installListener: function() {
      appEvents.onDataChange(function(data) {
        var troupeId = data.troupeId;
        var modelId = data.modelId;
        var modelName = data.modelName;
        var operation = data.operation;
        var model = data.model;

        if(DEFAULT_ITEM_TYPES.indexOf(modelName) >= 0) {
          if(operation === 'create') {
            var creatingUserId = findCreatingUserIdModel(modelName, model);

            newItem(troupeId, creatingUserId, modelName, modelId);
          } else if(operation === 'remove') {
            removeItem(troupeId, modelName, modelId);
          }

        }

      });
  }

};
