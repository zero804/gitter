'use strict';

var env            = require('gitter-web-env');
var stats          = env.stats;
var roomMembershipService = require('./room-membership-service');
var Q              = require('q');
var restSerializer = require('../serializers/rest-serializer');
var appEvents      = require('gitter-web-appevents');
var debug          = require('debug')('gitter:room-membership-events');
var troupeService  = require('./troupe-service');

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

function onMembersAdded(troupeId, userIds) {
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
}

function onMembersRemoved(troupeId, userIds) {
  // FIXME: NOCOMMIT deal with one to ones
  userIds.forEach(function(userId) {
    /* Dont mark the user as having been removed from the room */
    appEvents.dataChange2('/rooms/' + troupeId + '/users', "remove", { id: userId });
    appEvents.dataChange2('/user/' + userId + '/rooms', "remove", { id: troupeId });

    appEvents.userRemovedFromTroupe({ troupeId: troupeId, userId: userId });
  });

}

function onMembersLurkChange(troupeId, userIds, lurk) {
  userIds.forEach(function(userId) {
    stats.event("lurk_room", {
      userId: '' + userId,
      troupeId: '' + troupeId,
      lurking: lurk
    });

    appEvents.userTroupeLurkModeChange({ userId: userId, troupeId: troupeId, lurk: lurk });

    // TODO: in future get rid of this but this collection is used by the native clients
    appEvents.dataChange2('/user/' + userId + '/rooms', 'patch', { id: troupeId, lurk: lurk });
  });
}

var installed = false;
exports.install = function() {
  if (installed) return;
  installed = true;

  var events = roomMembershipService.events;

  events.on("members.added", onMembersAdded);

  events.on("members.removed", onMembersRemoved);

  events.on("members.lurk.change", onMembersLurkChange);
};

exports.testOnly = {
  onMembersAdded: onMembersAdded,
  onMembersRemoved: onMembersRemoved,
  onMembersLurkChange: onMembersLurkChange
};
