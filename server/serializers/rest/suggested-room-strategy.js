"use strict";

var persistence = require('../../services/persistence-service');
var collections = require('../../utils/collections');
var mongoUtils = require('../../utils/mongo-utils');
var resolveRoomAvatarUrl = require('gitter-web-shared/avatars/resolve-room-avatar-url');

function SuggestedRoomStrategy() {
  var roomHash;

  this.preload = function(suggestedRooms) {
    var suggestedRoomIds = suggestedRooms
      .filter(function(f) { return !!f.roomId; })
      .map(function(f) { return mongoUtils.asObjectID(f.roomId); });

    if (suggestedRoomIds.isEmpty()) {
      roomHash = {};
      return;
    }

    return persistence.Troupe.find({
        _id: { $in: suggestedRoomIds.toArray() }, 
        security: 'PUBLIC'
      }, {
        uri: 1,
        githubType: 1,
        userCount: 1,
        topic: 1
      })
      .exec()
      .then(function(rooms) {
        roomHash = collections.indexById(rooms);
      });
  };

  this.map = function(suggestedRoom) {
    var room = roomHash[suggestedRoom.roomId] || suggestedRoom.room;
    var uri = room && room.uri || suggestedRoom.uri;
    if (!uri) return;

    return {
      id: room && room.id,
      uri: uri,
      avatarUrl: resolveRoomAvatarUrl((room && room.uri) ? room : suggestedRoom, 48),
      userCount: room && room.userCount || suggestedRoom.userCount,
      description: room && room.topic || suggestedRoom.topic,
      exists: !!room
    };
  };
}

SuggestedRoomStrategy.prototype = {
  name: 'SuggestedRoomStrategy'
};

module.exports = SuggestedRoomStrategy;
