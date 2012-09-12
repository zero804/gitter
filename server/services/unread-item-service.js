/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("./troupe-service");
var redis = require("redis");
var winston = require("winston");

var redisClient = redis.createClient();

var DEFAULT_ITEM_TYPES = ['file', 'chat'];

module.exports = {
  newItem: function(troupeId, itemType, itemId) {
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
  },

  markItemsRead: function(userId, items) {
    var multi = redisClient.multi();

    items.forEach(function(item) {
      multi.srem("unread:" + item.itemType + ":" + userId, item.itemId);
    });

    multi.exec(function(err, replies) {
      if(err) winston.error("unreadItemService.markItemsRead failed", err);
    });
  },

  getUserUnreadCounts: function(userId, callback) {
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

      return result;
    });
  }

};
