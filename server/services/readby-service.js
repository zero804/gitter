/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var RedisBatcher = require('../utils/redis-batcher').RedisBatcher;
var persistence = require('./persistence-service');
var assert = require('assert');
var batcher = new RedisBatcher('readby', 0);
var winston = require('../utils/winston');
var appEvents = require('gitter-web-appevents');
var mongoUtils = require('../utils/mongo-utils');
var Q = require('q');
var liveCollections = require('./live-collections');

// TODO: move this into a listener
batcher.listen(function(key, userIdStrings, done) {
  var kp = key.split(':', 3);

  // Ignore everything except chats for now
  if(kp[0] !== 'chat') return done();

  var troupeId = mongoUtils.asObjectID(kp[1]);
  var chatId = mongoUtils.asObjectID(kp[2]);

  var userIds = userIdStrings.map(mongoUtils.asObjectID);

  persistence.ChatMessage.findOneAndUpdateQ(
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
});

/**
 * Record items as having been read
 * @return promise of nothing
 */
exports.recordItemsAsRead = function(userId, troupeId, items, callback) {
  return Q.fcall(function() {
    assert(userId, 'userId expected');
    assert(items, 'items expected');
    if(!items.chat || !items.chat.length) return callback && callback(); // Don't bother with anything other than chats for the moment

    var itemIds = items.chat;
    return Q.all(itemIds.map(function(id) {
      var d = Q.defer();

      assert(mongoUtils.isLikeObjectId(id));
      assert(mongoUtils.isLikeObjectId(userId));

      var idSerialized = mongoUtils.serializeObjectId(id);
      var userIdSerialized = mongoUtils.serializeObjectId(userId);

      batcher.add('chat:' + troupeId + ':' + idSerialized, userIdSerialized, d.makeNodeResolver());

      return d.promise;
    }));
  })
  .nodeify(callback);

};
