'use strict';

var Q = require('q');
var presenceService = require('./presence-service');
var collections = require('../utils/collections');

var STATUS_INROOM = 'inroom';
var STATUS_ONLINE = 'online';
var STATUS_OFFLINE = 'offline';

/* Categorize users in a room by their notification status */
module.exports = function (roomId, userIds) {
  if (!userIds || !userIds.length) return {};
  // TODO:
  console.error('Remember to add push support to this method')

  return Q.all([
    presenceService.findOnlineUsersForTroupe(roomId),
    presenceService.categorizeUsersByOnlineStatus(userIds)
  ]).spread(function(userIdsInRoom, onlineStatus) {
    var inRoomHash = collections.hashArray(userIdsInRoom);

    var result = {};
    userIds.forEach(function(userId) {
      if (inRoomHash[userId]) {
        result[userId] = STATUS_INROOM;
      } else {
        if (onlineStatus[userId] === 'online') {
          result[userId] = STATUS_ONLINE;
        } else {
          result[userId] = STATUS_OFFLINE;
        }
      }
    });

    return result;
  });

};
