"use strict";

var Q = require('q');
var assert = require('assert');
var roomPermissionsModel = require('./room-permissions-model');
var roomMembershipService = require('./room-membership-service');

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
        if(!access) return [];

        return roomMembershipService.findMembersForRoom(room.id);
      });
  }

  // In future look up other groups here...
}

/**
 * Given a room, a user and a list of group names,
 * returns a hash of the groupName and the users in that group
 */
module.exports = function resolve(room, user, groupNames) {
  return Q.fcall(function() {
    assert(room && room.id);
    assert(user && user.id);

    if(!groupNames.length) return {}; // No point in continuing

    return Q.all(groupNames.map(function(groupName) {
        return resolveTeam(room, user, groupName);
      }))
      .then(function(arraysOfIserIds) {
        // Turn the array of arrays into a hash
        return arraysOfIserIds.reduce(function(memo, userIds, i) {
          var groupName = groupNames[i];
          memo[groupName] = userIds;
          return memo;
        }, {});

      });

  });

};
