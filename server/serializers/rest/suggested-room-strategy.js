"use strict";

var Promise = require('bluebird');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

var GroupIdStrategy = require('./group-id-strategy');
var UserIdStrategy = require('./user-id-strategy');
var resolveOneToOneOtherUser = require('../resolve-one-to-one-other-user');
var getRoomNameAndUrl = require('../get-room-name-and-url');
var getAvatarUrlForRoom = require('../get-avatar-url-for-room');
var oneToOneOtherUserSequence = require('../one-to-tne-other-user-sequence');

// function RoomMessageCountStrategy() {
//   this.messageCounts = null;
// }
//
// RoomMessageCountStrategy.prototype = {
//   preload: function(troupeIds) {
//     if (troupeIds.isEmpty()) return;
//
//     return estimatedChatsService.getEstimatedMessageCountForRoomIds(troupeIds.toArray())
//       .bind(this)
//       .timeout(1000)
//       .then(function(messageCounts) {
//         this.messageCounts = messageCounts;
//       })
//       .catch(function(e) {
//         logger.warn('Message count failure', { exception: e });
//       });
//   },
//
//   map: function(troupeId) {
//     return this.messageCounts && this.messageCounts[troupeId];
//   },
//
//   name: 'RoomMessageCountStrategy'
// };

function SuggestedRoomStrategy(options) {
  // var messageCountStrategy;

  var currentUserId = options && mongoUtils.asObjectID(options.currentUserId);

  var groupIdStrategy;
  var userIdStrategy;

  this.preload = function(suggestedRooms) {
    var strategies = [];


    groupIdStrategy = new GroupIdStrategy(options);
    var groupIds = suggestedRooms.map(function(troupe) {
        return troupe.groupId;
      })
      .filter(function(f) {
        return !!f;
      });

    strategies.push(groupIdStrategy.preload(groupIds));


    if (currentUserId) {
      // The other user in one-to-one rooms
      var otherUserIds = oneToOneOtherUserSequence(currentUserId, suggestedRooms);
      if (!otherUserIds.isEmpty()) {
        userIdStrategy = new UserIdStrategy(options);
        strategies.push(userIdStrategy.preload(otherUserIds));
      }
    }

    // if (suggestedRooms.isEmpty()) return;
    //
    // var troupeIds = suggestedRooms
    //   .map(function(troupe) {
    //     return troupe._id || troupe.id;
    //   })
    //   .filter(function(f) {
    //     return !!f;
    //   });
    //
    // messageCountStrategy = new RoomMessageCountStrategy();
    // return messageCountStrategy.preload(troupeIds);

    return Promise.all(strategies);
  };

  this.map = function(suggestedRoom) {
    var uri = suggestedRoom && suggestedRoom.uri;
    if (!uri) return;

    var id = suggestedRoom.id || suggestedRoom._id;

    var group = groupIdStrategy && suggestedRoom.groupId ? groupIdStrategy.map(suggestedRoom.groupId) : undefined;

    var providers = (suggestedRoom.providers && suggestedRoom.providers.length) ?
        suggestedRoom.providers :
        undefined;


    var otherUser;
    var slimOtherUser = resolveOneToOneOtherUser(suggestedRoom, currentUserId);
    if(slimOtherUser) {
      otherUser = userIdStrategy.map(slimOtherUser.userId);
    }

    var nameInfo = getRoomNameAndUrl(group, suggestedRoom, {
      otherUser: otherUser
    });
    var troupeName = nameInfo.name;

    var avatarUrl = getAvatarUrlForRoom(suggestedRoom, {
      name: troupeName,
      group: group,
      user: otherUser
    });

    return {
      id: id,
      uri: uri,
      avatarUrl: avatarUrl,
      userCount: suggestedRoom.userCount,
      messageCount: undefined, // messageCountStrategy.map(id),
      tags: suggestedRoom.tags,
      providers: providers,
      // TODO: users/avatars (sample)
      description: suggestedRoom.topic,
      exists: !!id
    };
  };
}

SuggestedRoomStrategy.prototype = {
  name: 'SuggestedRoomStrategy'
};

module.exports = SuggestedRoomStrategy;
