'use strict';

var Q = require('q');
var presenceService = require('gitter-web-presence');
var collections = require('../utils/collections');
var pushNotificationService = require('./push-notification-service');
var pushNotificationFilter = require('gitter-web-push-notification-filter');

var STATUS_INROOM = 'inroom';
var STATUS_ONLINE = 'online';
var STATUS_PUSH = 'push';
var STATUS_PUSH_NOTIFIED = 'push_notified'; // Has already been notified

/*
 * Categorize users in a room by their notification status, returns a value
 * hashed by userid
 *
 * values can be:
 *  - inroom: currently in the room
 *  - online: currently online
 *  - push: awaiting a push notification
 *  - push_notified: already used up all their push notifications. Only push for mentions
 *  - <doesnotexist>: user is offline, nothing more to do
 */
module.exports = function (roomId, userIds) {
  if (!userIds || !userIds.length) return Q.resolve({});

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

    return pushNotificationService.findUsersWithDevices(offlineUsers)
      .then(function(withDevices) {
        if (!withDevices.length) {
          /* No devices with push... */
          return result;
        }

        return pushNotificationFilter.findUsersInRoomAcceptingNotifications(roomId, withDevices)
          .then(function(usersWithDevicesAcceptingNotifications) {
            usersWithDevicesAcceptingNotifications.forEach(function(userId) {
              result[userId] = STATUS_PUSH;
            });

            withDevices.forEach(function(userId) {
              if (!result[userId]) {
                // If the user is not STATUS_PUSH, they should be STATUS_PUSH_NOTIFIED
                result[userId] = STATUS_PUSH_NOTIFIED;
              }
            });

            return result;
          });
      });
  });

};
