"use strict";

var Promise = require('bluebird');
var assert = require('assert');
var roomPermissionsModel = require('./room-permissions-model');
var roomMembershipService = require('./room-membership-service');
var _ = require('lodash');
var userRoomNotificationService = require('./user-room-notification-service')
/**
 * Return a value or a promise of the team members
 */
function resolveTeam(room, user, groupName) {
  if(!groupName) return;
  groupName = String(groupName);

  if(groupName.toLowerCase() === 'all') {
    // Only admins are allowed to use 'all' for now
    return roomPermissionsModel(user, 'admin', room)
      .then(function(access) {
        if(!access) return;

        // CODEDEBT, drop this
        // https://github.com/troupe/gitter-webapp/issues/985
        return Promise.join(
          roomMembershipService.findMembersForRoom(room.id),
          userRoomNotificationService.findUsersInRoomWithSetting(room.id, 'mute'),
          function(userIds, mutedUserIds) {
            if (!mutedUserIds || !mutedUserIds.length) return userIds;

            var mutedHash = _.reduce(mutedUserIds, function(memo, userId) {
              memo[userId] = true;
              return memo;
            });

            return userIds.filter(function(userId) {
              /* Only return non muted users */
              return !mutedHash[userId];
            });
          })
          .then(function(userIds) {
            return { announcement: true, userIds: userIds };
          });
      });
  }

  // In future look up other groups here...
}

/**
 * Given a room, a user and a list of group names,
 * returns a hash of the groupName and the users in that group
 */
module.exports = Promise.method(function resolve(room, user, groupNames) {
  assert(room && room.id);
  assert(user && user.id);

  if(!groupNames.length) return {}; // No point in continuing

  return Promise.map(groupNames, function(groupName) {
      return resolveTeam(room, user, groupName);
    })
    .then(function(groupDetails) {
      // Turn the array of arrays into a hash
      return _.reduce(groupDetails, function(memo, groupDetail, i) {
        if (!groupDetail) return memo;

        var groupName = groupNames[i];
        memo[groupName] = groupDetail;
        return memo;
      }, {});
    });
});
