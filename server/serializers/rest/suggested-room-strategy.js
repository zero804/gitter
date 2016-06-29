"use strict";

var env = require('gitter-web-env');
var logger = env.logger;
var estimatedChatsService = require('../../services/estimated-chats-service');
var resolveRoomAvatarUrl = require('gitter-web-shared/avatars/resolve-room-avatar-url');

function RoomMessageCountStrategy() {
  this.messageCounts = null;
}

RoomMessageCountStrategy.prototype = {
  preload: function(troupeIds) {
    if (troupeIds.isEmpty()) return;

    return estimatedChatsService.getEstimatedMessageCountForRoomIds(troupeIds.toArray())
      .bind(this)
      .timeout(1000)
      .then(function(messageCounts) {
        this.messageCounts = messageCounts;
      })
      .catch(function(e) {
        logger.warn('Message count failure', { exception: e });
      });
  },

  map: function(troupeId) {
    return this.messageCounts && this.messageCounts[troupeId];
  },

  name: 'RoomMessageCountStrategy'
};

function SuggestedRoomStrategy() {
  var messageCountStrategy;

  this.preload = function(suggestedRooms) {
    if (suggestedRooms.isEmpty()) return;

    var troupeIds = suggestedRooms
      .map(function(troupe) {
        return troupe._id || troupe.id;
      })
      .filter(function(f) {
        return !!f;
      });

    messageCountStrategy = new RoomMessageCountStrategy();
    return messageCountStrategy.preload(troupeIds);
  };

  this.map = function(suggestedRoom) {
    var uri = suggestedRoom && suggestedRoom.uri;
    if (!uri) return;

    var providers = (suggestedRoom.providers && suggestedRoom.providers.length) ?
        suggestedRoom.providers :
        undefined;

    return {
      id: suggestedRoom.id,
      uri: uri,
      avatarUrl: resolveRoomAvatarUrl(suggestedRoom, 48),
      userCount: suggestedRoom.userCount,
      messageCount: messageCountStrategy.map(suggestedRoom.id),
      tags: suggestedRoom.tags,
      providers: providers,
      // TODO: users/avatars (sample)
      description: suggestedRoom.topic,
      exists: !!suggestedRoom.id
    };
  };
}

SuggestedRoomStrategy.prototype = {
  name: 'SuggestedRoomStrategy'
};

module.exports = SuggestedRoomStrategy;
