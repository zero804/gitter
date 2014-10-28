/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q                  = require('q');
var StatusError        = require('statuserror');
var appEvents          = require('../app-events');
var recentRoomService  = require('./recent-room-service');
var roomPermissionsModel = require('./room-permissions-model');
var unreadItemService = require('./unread-item-service');

// Check parameters

function checkParameters(room, user) {
  if(!room) return Q.reject(new StatusError(400, 'Room required'));
  if(!user) return Q.reject(new StatusError(400, 'User required'));
  return Q.resolve();
}

// Base removal functions

function removeFavourite(room, userId, isMember) {
  if (typeof isMember === 'undefined') isMember = !!room.findTroupeUser(userId);
  return recentRoomService.removeRecentRoomForUser(userId, room.id, isMember);
}

function removeFromRoom(room, userId) {
  room.removeUserById(userId);
  return room.saveQ();
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
    return removeFavourite(room, userId, false);
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
    var roomId = room.id;
    var user = room.findTroupeUser(userId);

    return removeFavourite(room, userId, !!user)
    .then(function() {
      if (user) {
        if (user.lurk) return removeFromRoom(room, userId);
        // TODO: in future get rid of this but this collection is used by the native clients
        appEvents.dataChange2('/user/' + userId + '/rooms', 'patch', { id: roomId, favourite: null, lastAccessTime: null, mentions: 0, unreadItems: 0 });
        return;
      }
      appEvents.dataChange2('/user/' + userId + '/rooms', 'remove', { id: roomId });
    });
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
  removeUserFromRoom: removeUserFromRoom
};
