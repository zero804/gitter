/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("./troupe-service");
var appEvents = require("../app-events");

var redis = require("redis");
var winston = require("winston");

var redisClient = redis.createClient();

var DEFAULT_ITEM_TYPES = ['file', 'chat'];


function newItem(troupeId, itemType, itemId) {
  troupeService.findById(troupeId, function(err, troupe) {
    if(err) return winston.error("Unable to load troupeId " + troupeId, err);

    var userIds = troupe.users;

      // multi chain with an individual callback
    var multi = redisClient.multi();
    userIds.forEach(function(userId) {
      multi.sadd("unread:" + itemType + ":" + userId, itemId);
    });

    multi.exec(function(err, replies) {
      if(err) winston.error("unreadItemService.newItem failed", err);
    });

  });
}

function markItemsRead(userId, troupeId, items) {
  var multi = redisClient.multi();

  items.forEach(function(item) {
    multi.srem("unread:" + item.itemType + ":" + userId, item.itemId);
  });

  multi.exec(function(err, replies) {
    if(err) winston.error("unreadItemService.markItemsRead failed", err);
  });
}

function getUserUnreadCounts(userId, troupeId, callback) {
  var multi = redisClient.multi();

  DEFAULT_ITEM_TYPES.forEach(function(itemType) {
    multi.scard("unread:" + itemType + ":" + userId);
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

function getUnreadItems(userId, troupeId, itemType, callback) {
    redisClient.smembers("unread:" + itemType + ":" + userId, function(err, members) {
      if(err) {
        winston.warn("unreadItemService.getUnreadItems failed", err);

        // Mask error
        return callback(null, []);
      }

      callback(null, members);
    });
}


module.exports = {
  newItem: newItem,
  markItemsRead: markItemsRead,
  getUnreadItems: getUnreadItems,
  getUserUnreadCounts: getUserUnreadCounts,

  /* TODO: make sure only one of these gets installed for the whole app */
  installListener: function() {
      appEvents.onDataChange(function(data) {
        var troupeId = data.troupeId;
        var modelId = data.modelId;
        var modelName = data.modelName;
        var operation = data.operation;
        var model = data.model;

        if(operation === 'create' && (modelName === 'file' || modelName === 'chat')) {
          console.log("newItem", troupeId, modelName, modelId);
          newItem(troupeId, modelName, modelId);
        }

      });
  }

};
