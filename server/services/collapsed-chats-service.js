"use strict";

var Promise = require('bluebird');
var redis = require("../utils/redis");
var redisClient = redis.getClient();
var Scripto = require('gitter-redis-scripto');

var scriptManager = new Scripto(redisClient);
scriptManager.loadFromDir(__dirname + '/../../redis-lua/collapsed');

var runScript = Promise.promisify(scriptManager.run, { context: scriptManager });
var redisClient_zrange = Promise.promisify(redisClient.zrange, { context: redisClient });
var redisClient_del = Promise.promisify(redisClient.del, { context: redisClient });

/*

How this works:

In redis, each user:room has a ZSET, containing at most MAX_ITEMS items. Defined in: gitter-webapp/redis-lua/collapsed/update.lua

 - When a new item is added, it's added to the ZSET using the current time as it's ranking

 - Every time a new item is added, all but the top MAX_ITEMS ranked items are dropped from the ZSET
   using ZREMRANGEBYRANK

*/
function getUserRoomKey(userId, roomId) {
  return "col:" + userId + ":" + roomId;
}
exports.getUserRoomKey = getUserRoomKey;

/**
 * Sets the collapsed state of an item
 *
 * Returns a promise of nothing
 */
function update(userId, roomId, chatId, collapsed) {
  var keys = [getUserRoomKey(userId, roomId)];
  var values = [Date.now(), chatId, collapsed ? 1 : 0];
  return runScript('update', keys, values);
}
exports.update = update;

/**
 * Returns the collapsed items for a given user:room.
 *
 * Returns a promise of a hash { chatId: true }, where
 */
function getHash(userId, roomId) {
  return redisClient_zrange(getUserRoomKey(userId, roomId), 0, -1)
    .then(function(chatIds) {
      // Turn the array of chat ids into a hash
      return chatIds.reduce(function(memo, index) {
        memo[index] = true;
        return memo;
      }, {});
    });

}
exports.getHash = getHash;

/**
 * Remove all the collapsed state items for a room.
 *
 * Returns a promise of nothing
 */
function removeAll(userId, roomId) {
  return redisClient_del(getUserRoomKey(userId, roomId));
}
exports.removeAll = removeAll;
