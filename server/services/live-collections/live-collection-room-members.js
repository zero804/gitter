"use strict";

var Q              = require('q');
var appEvents      = require('gitter-web-appevents');
var restSerializer = require("../../serializers/rest-serializer");
var troupeService  = require('../troupe-service');

function notifyGroupRoomOfAddedUsers(room, userIds) {
  /* No point in notifing large rooms */
  if (room.userCount > 100) return Q.resolve();

  return restSerializer.serialize(userIds, new restSerializer.UserIdStrategy())
    .then(function(serializedUsers) {
      var roomUrl = "/rooms/" + room.id + "/users";
      serializedUsers.forEach(function(serializedUser) {
        appEvents.dataChange2(roomUrl, "create", serializedUser);
      });
    });
}

function notifyUsersOfAddedGroupRooms(room, userIds) {
  // TODO: custom serializations per user
  return restSerializer.serialize(room, new restSerializer.TroupeStrategy())
    .then(function(serializedRoom) {

        userIds.forEach(function(userId) {
          var userUrl = "/user/" + userId + "/rooms";
          appEvents.dataChange2(userUrl, "create", serializedRoom);
        });
    });
}

function notifyUsersOfAddedOneToOneRooms(room, userIds) {
  return Q.all(userIds.map(function(userId) {
    var strategy = new restSerializer.TroupeStrategy({ currentUserId: userId });

    return restSerializer.serialize(room, strategy)
      .then(function(serializedRoom) {
        appEvents.dataChange2('/user/' + userId + '/rooms', "create", serializedRoom);
      });
  }));
}

module.exports = {
  added: function(troupeId, userIds) {
    return troupeService.findById(troupeId)
      .then(function(room) {
        if (room.oneToOne) {
          return notifyUsersOfAddedOneToOneRooms(room, userIds);
        }

        /** Don't bother in large rooms */
        if (room.userCount > 100) return;

        return Q.all([
          notifyGroupRoomOfAddedUsers(room, userIds),
          notifyUsersOfAddedGroupRooms(room, userIds)
        ]);
      });
  },

  removed: function(troupeId, userIds) {
    // FIXME: NOCOMMIT deal with one to ones
    userIds.forEach(function(userId) {
      /* Dont mark the user as having been removed from the room */
      appEvents.dataChange2('/rooms/' + troupeId + '/users', "remove", { id: userId });
      appEvents.dataChange2('/user/' + userId + '/rooms', "remove", { id: troupeId });

      appEvents.userRemovedFromTroupe({ troupeId: troupeId, userId: userId });
    });

    return Q.resolve();
  },

  lurkChange: function(troupeId, userIds, lurk) {
    userIds.forEach(function(userId) {
      appEvents.userTroupeLurkModeChange({ userId: userId, troupeId: troupeId, lurk: lurk });

      // TODO: in future get rid of this but this collection is used by the native clients
      appEvents.dataChange2('/user/' + userId + '/rooms', 'patch', { id: troupeId, lurk: lurk });
    });

    return Q.resolve();
  }

};
