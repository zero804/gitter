"use strict";

var persistence = require('../../services/persistence-service');
var collections = require('../../utils/collections');
var mongoUtils = require('../../utils/mongo-utils');
var resolveRoomAvatarUrl = require('gitter-web-shared/avatars/resolve-room-avatar-url');

function SuggestedRoomStrategy() {
  var roomHash;

  this.preload = function(suggestedRooms, callback) {
    // NOTE: only suggestions with roomId will be preloaded. If it has a room
    // attribute then that will be used.
    var suggestedRoomIds = suggestedRooms
      .filter(function(f) { return !!f.roomId; })
      .map(function(f) { return mongoUtils.asObjectID(f.roomId); });

    if (!suggestedRoomIds.length) {
      roomHash = {};
      callback();
      return;
    }

    persistence.Troupe.find({ _id: { $in: suggestedRoomIds }, security: 'PUBLIC' }, { uri: 1, githubType: 1, userCount: 1, topic: 1 })
      .exec()
      .then(function(rooms) {
        roomHash = collections.indexById(rooms);
      })
      .nodeify(callback);
  };

  this.map = function(suggestedRoom) {
    // NOTE: It uses the preloaded room for suggestions with roomId, otherwise
    // it uses sthe room attribute if that exists, otherwise the code below
    // will just fall through to use suggestedRoom.
    var room = roomHash[suggestedRoom.roomId] || suggestedRoom.room;
    var uri = room && room.uri || suggestedRoom.uri;
    if (!uri) return;

    return {
      id: room && room.id || suggestedRoom.id,
      uri: uri,
      avatarUrl: resolveRoomAvatarUrl((room && room.uri) ? room : suggestedRoom, 48),
      userCount: room && room.userCount || suggestedRoom.userCount,
      messageCount: room && room.messageCount || suggestedRoom.messageCount,
      // NOTE: room.topic isn't always loaded in
      description: room && room.topic || suggestedRoom.topic,
      exists: !!room || suggestedRoom._id
    };
  };
}

SuggestedRoomStrategy.prototype = {
  name: 'SuggestedRoomStrategy'
};

module.exports = SuggestedRoomStrategy;
