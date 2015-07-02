/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('../../services/persistence-service');
var collections = require('../../utils/collections');
var mongoUtils = require('../../utils/mongo-utils');

function getOwnerAvatarUrl(room) {
  if (!room.uri) return;

  return 'https://avatars.githubusercontent.com/' + room.uri.split('/')[0];
}

function SuggestedRoomStrategy() {
  var roomHash;

  this.preload = function(suggestedRoomsIds, callback) {
    persistence.Troupe.findQ({ _id: { $in: mongoUtils.asObjectIDs(suggestedRoomsIds) }, security: 'PUBLIC' }, { uri: 1, githubType: 1, userCount: 1, topic: 1 })
      .then(function(rooms) {
        roomHash = collections.indexById(rooms);
      })
      .nodeify(callback);
  };

  this.map = function(suggestedRoomId) {
    var room = roomHash[suggestedRoomId];
    if (!room) return;

    return {
      id: room.id,
      uri: room.uri,
      githubType: room.githubType,
      avatarUrl: getOwnerAvatarUrl(room),
      // exists: !!suggestedRoom.room,
      userCount: room.userCount,
      description: room.topic
    };
  };
}

SuggestedRoomStrategy.prototype = {
  name: 'SuggestedRoomStrategy'
};

module.exports = SuggestedRoomStrategy;
