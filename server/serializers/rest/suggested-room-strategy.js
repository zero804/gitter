/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('../../services/persistence-service');
var collections = require('../../utils/collections');
var mongoUtils = require('../../utils/mongo-utils');

function getOwnerAvatarUrl(roomUri) {
  if (!roomUri) return;

  return 'https://avatars.githubusercontent.com/' + roomUri.split('/')[0];
}

function SuggestedRoomStrategy() {
  var roomHash;

  this.preload = function(suggestedRooms, callback) {
    var suggestedRoomIds = suggestedRooms
      .filter(function(f) { return !!f.roomId; })
      .map(function(f) { return mongoUtils.asObjectID(f.roomId); });

    if (!suggestedRoomIds.length) {
      roomHash = {};
      callback();
      return;
    }

    persistence.Troupe.findQ({ _id: { $in: suggestedRoomIds }, security: 'PUBLIC' }, { uri: 1, githubType: 1, userCount: 1, topic: 1 })
      .then(function(rooms) {
        roomHash = collections.indexById(rooms);
      })
      .nodeify(callback);
  };

  this.map = function(suggestedRoom) {
    var room = roomHash[suggestedRoom.roomId] || suggestedRoom.room;
    var uri = room && room.uri || suggestedRoom.uri;
    if (!uri) return;

    return {
      id: room && room.id,
      uri: uri,
      avatarUrl: getOwnerAvatarUrl(uri),
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
