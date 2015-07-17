"use strict";

var roomMembershipService    = require('./room-membership-service');
var userService              = require('./user-service');
var Q                        = require("q");

var LARGE_ROOM_SIZE_THRESHOLD = 200;

/* Exports */
exports.findUsersInRoom             = findUsersInRoom;
exports.findUsersInLargeRoom        = findUsersInLargeRoom;
exports.findUsersInSmallRoom        = findUsersInSmallRoom;

function findUsersInRoom(troupeId, searchTerm, limit) {
  return roomMembershipService.countMembersInRoom(troupeId)
    .then(function(userCount) {
      if (userCount < LARGE_ROOM_SIZE_THRESHOLD) {
        return findUsersInSmallRoom(troupeId, searchTerm, limit);
      } else {
        return findUsersInLargeRoom(troupeId, searchTerm, limit);
      }
    });
}

function findUsersInLargeRoom(troupeId, searchTerm, limit) {
  if (searchTerm.length < 3) return Q.resolve([]);

  if (!limit) limit = 30;

  return userService.findIdsBySearchTerm(searchTerm, 500)
    .then(function(userIds) {
      if (!userIds.length) return Q.resolve([]);

      return roomMembershipService.findMembershipForUsersInRoom(troupeId, userIds)
        .then(function(userIds) {
          if (!userIds.length) return Q.resolve([]);
          userIds = userIds.slice(0, limit);

          return userService.findByIds(userIds);
        });
    });

}

function findUsersInSmallRoom(troupeId, searchTerm, limit) {
  /* The limit must only be applied post findMembersForRoom */
  return roomMembershipService.findMembersForRoom(troupeId)
    .then(function(userIds) {
      return userService.findByIdsAndSearchTerm(userIds, searchTerm, limit || 30);
    });

}
