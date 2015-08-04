'use strict';

var Q = require('q');
var presenceService = require('gitter-web-presence');
var collections = require('../utils/collections');
var pushNotificationService = require('./push-notification-service');

var STATUS_INROOM = 'inroom';
var STATUS_ONLINE = 'online';
var STATUS_OFFLINE = 'offline';
var STATUS_PUSH = 'push';

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
    var offlineUsers = [];

    userIds.forEach(function(userId) {
      if (inRoomHash[userId]) {
        result[userId] = STATUS_INROOM;
      } else {
        if (onlineStatus[userId] === 'online') {
          result[userId] = STATUS_ONLINE;
        } else {
          offlineUsers.push(userId);
        }
      }
    });

    if (!offlineUsers.length) {
      return result;
    }

    return pushNotificationService.findUsersWithDevicesHashed(offlineUsers)
      .then(function(withDevicesHash) {
        offlineUsers.forEach(function(userId) {
          result[userId] = withDevicesHash[userId] ? STATUS_PUSH: STATUS_OFFLINE;
        });
        
        return result;
      });
  });

};
