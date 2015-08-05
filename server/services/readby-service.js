/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var RedisBatcher = require('../utils/redis-batcher').RedisBatcher;
var ChatMessage = require('./persistence-service').ChatMessage;
var assert = require('assert');
var winston = require('../utils/winston');
var appEvents = require('gitter-web-appevents');
var mongoUtils = require('../utils/mongo-utils');
var Q = require('q');
var liveCollections = require('./live-collections');

// TODO: remove by 1 September 2015
var batcherLegacy = new RedisBatcher('readby', 600, batchUpdateReadbyBatchLegacy);

var batcher = new RedisBatcher('readby2', 600, batchUpdateReadbyBatch);

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

  var bulk = ChatMessage.collection.initializeUnorderedBulkOp();
  var chatObjectIds = [];

  chatIds.forEach(function(chatIdString) {
    var userIdStrings = userChatHash[chatIdString];
    var chatId = mongoUtils.asObjectID(chatIdString);
    var userIds = userIdStrings.map(mongoUtils.asObjectID);

    chatObjectIds.push(chatId);

    bulk
      .find({ _id: chatId, toTroupeId: troupeId })
      .updateOne({
        $addToSet:  { 'readBy': { $each: userIds } }
      });
  });

  var d = Q.defer();
  bulk.execute(d.makeNodeResolver());
  return d.promise
    .then(function() {
      return ChatMessage.aggregateQ([
        { $match: { _id: { $in: chatObjectIds } } },
        { $project: {
            _id: 1,
            _tv: 1,
            readyByC: { $size: "$readBy" }
          }
        }]);
    })
    .then(function(chats) {
      chats.forEach(function(chat) {
        var chatIdString = mongoUtils.serializeObjectId(chat._id);

        liveCollections.chats.emit('patch', chatIdString, troupeId, {
          readBy: chat.readyByC,
          v: chat._tv ? 0 + chat._tv : undefined
        });

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
    .nodeify(done);

}

// TODO: remove by 1 September 2015
function batchUpdateReadbyBatchLegacy(key, userIdStrings, done) {
  var kp = key.split(':', 3);

  // TODO: batch by troupeId only and get this operation to use batch updates

  // Ignore everything except chats for now
  if(kp[0] !== 'chat') return done();

  var troupeId = mongoUtils.asObjectID(kp[1]);
  var chatId = mongoUtils.asObjectID(kp[2]);

  var userIds = userIdStrings.map(mongoUtils.asObjectID);

  ChatMessage.findOneAndUpdateQ(
    { _id: chatId, toTroupeId: troupeId },
    { $addToSet:  { 'readBy': { $each: userIds } } },
    { select: { readBy: 1, _tv: 1 }, new: true })
    .then(function(chat) {
      if (!chat) {
        winston.info('Weird. No chat message found');
        return;
      }

      liveCollections.chats.emit('patch', chatId, troupeId, {
        readBy: chat.readBy.length,
        v: chat._tv ? 0 + chat._tv : undefined
      });

      // Its too operationally expensive to serialise the full user object
      // TODO: move this across to live-collections
      userIds.forEach(function(userId) {
        appEvents.dataChange2("/rooms/" + troupeId + "/chatMessages/" + chatId + '/readBy', 'create', {
          id: userId
        });
      });

    })
    .nodeify(done);
}

exports.listen = function() {
  batcherLegacy.listen();
  batcher.listen();
};

exports.testOnly = {
  batchUpdateReadbyBatch: batchUpdateReadbyBatch
};
