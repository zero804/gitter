"use strict";

var Promise = require('bluebird');
var chatService = require('../../services/chat-service');
var persistence = require('../../services/persistence-service');
var collections = require('../../utils/collections');
var mongoUtils = require('../../utils/mongo-utils');
var resolveRoomAvatarUrl = require('gitter-web-shared/avatars/resolve-room-avatar-url');

var loadRooms = Promise.method(function(roomIds) {
  if (!roomIds.length) {
    return [];
  }

  return persistence.Troupe.find({ _id: { $in: roomIds }, security: 'PUBLIC' }, { uri: 1, githubType: 1, userCount: 1, topic: 1, tags: 1 })
    .exec();
});

var loadMessageCounts = Promise.method(function(roomIds) {
  if (!roomIds.length) {
    return [];
  }
  return Promise.map(roomIds, function(roomId) {
    return chatService.getRoughMessageCount(roomId)
      .then(function(messageCount) {
        return {
          id: roomId,
          count: messageCount
        };
      });
  });
});

function SuggestedRoomStrategy() {
  var roomHash;
  var messageCountHash;

  this.preload = function(suggestedRooms) {
    var allRoomIds = suggestedRooms.map(function(suggestedRoom) {
        return suggestedRoom.roomId || suggestedRoom.id;
      })
      .toArray();

    // NOTE: only suggestions with roomId will be preloaded. Otherwise it
    // assumes that the suggestion IS the room.
    var suggestedRoomIds = suggestedRooms
      .filter(function(f) { return !!f.roomId; })
      .map(function(f) { return mongoUtils.asObjectID(f.roomId); })
      .toArray();

    return Promise.join(
      loadRooms(suggestedRoomIds),
      loadMessageCounts(allRoomIds),
      function(rooms, messageCounts) {
        roomHash = collections.indexById(rooms);
        messageCountHash = {};
        messageCounts.forEach(function(mc) {
          messageCountHash[mc.id] = mc.count;
        });
      });
  };

  this.map = function(suggestedRoom) {
    // NOTE: It uses the preloaded room for suggestions with roomId
    // (getSuggestionsForRoom), otherwise it assumes that the entire object is
    // the room (getSuggestionsForUserId.)
    var room = roomHash[suggestedRoom.roomId] || suggestedRoom;

    var uri = room && room.uri;
    if (!uri) return;

    return {
      id: room.id,
      uri: uri,
      avatarUrl: resolveRoomAvatarUrl(room, 48),
      userCount: room.userCount,
      messageCount: messageCountHash[room.id],
      tags: room.tags,
      // TODO: users/avatars (sample)
      description: room.topic,
      exists: !!room.id
    };
  };
}

SuggestedRoomStrategy.prototype = {
  name: 'SuggestedRoomStrategy'
};

module.exports = SuggestedRoomStrategy;
