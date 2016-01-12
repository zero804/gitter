"use strict";

var env             = require('gitter-web-env');
var logger          = env.logger;
var config          = env.config;
var RedisBatcher    = require('../utils/redis-batcher').RedisBatcher;
var ChatMessage     = require('./persistence-service').ChatMessage;
var assert          = require('assert');
var appEvents       = require('gitter-web-appevents');
var mongoUtils      = require('../utils/mongo-utils');
var Q               = require('q');
var liveCollections = require('./live-collections');

var batcher = new RedisBatcher('readby2', 600, batchUpdateReadbyBatch);

var disableLiveUpdateReadByCollections = !!config.get('disableLiveUpdateReadByCollections');

/**
 * Record items as having been read
 * @return promise of nothing
 */
exports.recordItemsAsRead = function(userId, troupeId, items, callback) {
  return Q.fcall(function() {
    assert(userId, 'userId expected');
    assert(items, 'items expected');
    var itemIds = items.chat;
    if(!itemIds || !itemIds.length) return; // Don't bother with anything other than chats for the moment

    var userIdSerialized = mongoUtils.serializeObjectId(userId);
    var userChatIds = itemIds.map(function(chatId) {
      return userIdSerialized + ":" + chatId;
    });

    var d = Q.defer();
    batcher.add(troupeId, userChatIds, d.makeNodeResolver());
    return d.promise;
  })
  .nodeify(callback);
};

function batchUpdateReadbyBatch(troupeIdString, userChatIds, done) {
  var troupeId = mongoUtils.asObjectID(troupeIdString);

  var userChatHash = {};

  userChatIds.forEach(function(userChatId) {
    var kp = userChatId.split(':', 2);
    var userIdString = kp[0];
    var chatIdString = kp[1];
    var value = userChatHash[chatIdString];
    if (!value) {
      userChatHash[chatIdString] = [userIdString];
    } else {
      value.push(userIdString);
    }
  });

  var chatIds = Object.keys(userChatHash);
  var chatObjectIds = chatIds.map(mongoUtils.asObjectID);

  return ChatMessage.find({
      _id: { $in: chatObjectIds },
      $or: [{ readBy: { $size: 0 } }, { readBy: { $exists: false }}]
    }, {
      _id: 1,
      _tv: 1
    }, {
      lean: true
    })
    // Great candidate for readConcern: major in future
    .exec(function(unreadChats) {
      var bulk = ChatMessage.collection.initializeUnorderedBulkOp();

      chatIds.forEach(function(chatIdString, index) {
        var userIdStrings = userChatHash[chatIdString];
        var chatId = chatObjectIds[index];
        var userIds = userIdStrings.map(mongoUtils.asObjectID);

        bulk
          .find({ _id: chatId, toTroupeId: troupeId })
          .updateOne({
            $addToSet:  { 'readBy': { $each: userIds } }
          });
      });

      var d = Q.defer();
      bulk.execute(d.makeNodeResolver());

      return d.promise
        .thenResolve(unreadChats);
    })
    .then(function(unreadChats) {
      // If the message was previously not read, send out a
      // notification to clients, but don't update it again
      unreadChats.forEach(function(chat) {
        var chatIdString = mongoUtils.serializeObjectId(chat._id);
        var userIdsReadChat = userChatHash[chatIdString];

        liveCollections.chats.emit('patch', chatIdString, troupeId, {
          readBy: userIdsReadChat.length,
          v: chat._tv ? 0 + chat._tv : undefined
        });
      });

      // Allow operators to turn live collection updates off
      // for readBy items
      if (disableLiveUpdateReadByCollections) return;

      chatIds.forEach(function(chatIdString) {
        var userIdsReadChat = userChatHash[chatIdString];

        // Its too operationally expensive to serialise the full user object
        // TODO: move this across to live-collections
        userIdsReadChat.forEach(function(userId) {
          appEvents.dataChange2("/rooms/" + troupeIdString + "/chatMessages/" + chatIdString + '/readBy', 'create', {
            id: userId
          });
        });
      });

    })
    .catch(function(err) {
      logger.error('batchUpdateReadbyBatch failed: ' + err.message, { exception: err });
      throw err;
    })
    .nodeify(done);

}

exports.listen = function() {
  batcher.listen();
};

exports.testOnly = {
  batchUpdateReadbyBatch: batchUpdateReadbyBatch
};
