/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q                  = require('q');
var StatusError        = require('statuserror');
var appEvents          = require('gitter-web-appevents');
var recentRoomService  = require('./recent-room-service');
var roomPermissionsModel = require('./room-permissions-model');
var unreadItemService = require('./unread-item-service');
var roomMembershipService = require('./room-membership-service');

// Check parameters

function checkParameters(room, user) {
  if(!room) return Q.reject(new StatusError(400, 'Room required'));
  if(!user) return Q.reject(new StatusError(400, 'User required'));
  return Q.resolve();
}

// Base removal functions

function removeFavourite(room, userId) {
  return recentRoomService.removeRecentRoomForUser(userId, room.id);
}

function removeFromRoom(room, userId) {
  return roomMembershipService.removeRoomMember(room._id, userId);
}

function removeUnreadCounts(room, userId) {
  return unreadItemService.markAllChatsRead(room.id, userId);
}

function removeFromRoomAndFavouriteAndUnread(room, userId) {
  return removeFromRoom(room, userId)
    .then(function() {
      return removeUnreadCounts(room, userId);
    })
    .then(function() {
      return removeFavourite(room, userId);
    });
}

// Exported functions

function userLeaveRoom(room, user) {
  return checkParameters(room, user)
  .then(function() {
    return removeFromRoomAndFavouriteAndUnread(room, user.id);
  });
}

function removeRecentRoomForUser(room, userId) {
  return checkParameters(room, userId)
  .then(function() {
    return removeFavourite(room, userId);
  })
  .then(function() {
    return roomMembershipService.getMemberLurkStatus(room._id, userId);
  })
  .then(function(userLurkStatus) {
    var roomId = room.id;

    if (userLurkStatus === null) {
      // User does not appear to be in the room...
      appEvents.dataChange2('/user/' + userId + '/rooms', 'remove', { id: roomId });
      return;
    }

    if (userLurkStatus) return removeFromRoom(room, userId);

    // TODO: in future get rid of this but this collection is used by the native clients
    appEvents.dataChange2('/user/' + userId + '/rooms', 'patch', { id: roomId, favourite: null, lastAccessTime: null, mentions: 0, unreadItems: 0 });
  });
}

function removeUserFromRoom(room, user, requestingUser) {
  return checkParameters(room, user)
  .then(function() {
    if (!requestingUser) throw new StatusError(401, 'Not authenticated');
    if (room.githubType === 'ONETOONE') throw new StatusError(400, 'This room does not support removing.');

    return roomPermissionsModel(requestingUser, 'admin', room)
    .then(function(access) {
      if(!access) throw new StatusError(403, 'You do not have permission to remove people. Admin permission is needed.');
    });
  })
  .then(function() {
    return removeFromRoomAndFavouriteAndUnread(room, user.id);
  });
}


module.exports = {
  userLeaveRoom: userLeaveRoom,
  removeRecentRoomForUser: removeRecentRoomForUser,
  removeUserFromRoom: removeUserFromRoom,
};
