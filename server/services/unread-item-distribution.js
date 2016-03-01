'use strict';

var env                   = require('gitter-web-env');
var errorReporter         = env.errorReporter;
var _                     = require('lodash');
var Promise               = require('bluebird');
var roomMembershipService = require('./room-membership-service');
var userService           = require("./user-service");
var roomPermissionsModel  = require('./room-permissions-model');
var categoriseUserInRoom  = require("./categorise-users-in-room");

/**
 * Given an array of non-member userIds in a room,
 * returns an array of those members who have permission to access
 * the room. They will be notified. People mentions who don't
 * have access will not.
 */
function findNonMembersWithAccess(troupe, userIds) {
  if (!userIds.length || troupe.oneToOne || troupe.security === 'PRIVATE') {
    // Trivial case, and the case where only members have access to the room type
    return Promise.resolve([]);
  }

  // Everyone can always access a public room
  if (troupe.security === 'PUBLIC') return Promise.resolve(userIds);

  return userService.findByIds(userIds)
    .then(function(users) {
      var result = [];

      return Promise.map(users, function(user) {
        /* TODO: some sort of bulk service here */
        return roomPermissionsModel(user, 'join', troupe)
          .then(function(access) {
            if(access) {
              result.push("" + user.id);
            }
          })
          .catch(function(e) {
            // Swallow errors here. If the call fails, the chat should not fail
            errorReporter(e, { username: user.username, operation: 'findNonMembersWithAccess' }, { module: 'unread-items' });
          });
      })
      .then(function() {
        return result;
      });
    });
}

function parseMentions(fromUserId, troupe, userIdsWithLurk, mentions) {
  var creatorUserId = fromUserId && "" + fromUserId;

  var announcement = false;
  var uniqueUserIds = {};
  _.each(mentions, function(mention) {
    if(mention.group) {
      if (mention.announcement) {
        announcement = true;
      }

      // Note: in future, annoucements won't have userIds for
      // the `all` group
      if (mention.userIds) {
        _.each(mention.userIds, function(userId) {
          uniqueUserIds[userId] = true;
        });
      }

    } else {
      if(mention.userId) {
        uniqueUserIds[mention.userId] = true;
      }
    }
  });

  var memberUserIds = [];
  var nonMemberUserIds = [];

  var userIds = Object.keys(uniqueUserIds);
  _.each(userIds, function(userId) {
    /* Don't be mentioning yourself yo */
    if(userId == creatorUserId) return;

    // If the user is in the room, add them to the memberUserIds list
    if(userIdsWithLurk.hasOwnProperty(userId)) {
      memberUserIds.push(userId);
      return;
    }

    // The user is not in the room, add them to the nonMembers list
    nonMemberUserIds.push(userId);
  });

  // Skip checking if there are no non-members
  if(!nonMemberUserIds.length) {
    return Promise.resolve({
      memberUserIds: memberUserIds,
      nonMemberUserIds: [],
      mentionUserIds: memberUserIds,
      announcement: announcement
    });
  }

  /* Lookup the non-members and check if they can access the room */
  return findNonMembersWithAccess(troupe, nonMemberUserIds)
    .then(function(nonMemberUserIdsFiltered) {
      /* Mentions consists of members and non-members */
      var mentionUserIds = memberUserIds.concat(nonMemberUserIdsFiltered);

      return {
        memberUserIds: memberUserIds,
        nonMemberUserIds: nonMemberUserIdsFiltered,
        mentionUserIds: mentionUserIds,
        announcement: announcement
      };
    });
}

function unreadItemDistribution(fromUserId, troupe, mentions) {
  var troupeId = troupe._id;
  return roomMembershipService.findMembersForRoomWithLurk(troupeId)
    .then(function(userIdsWithLurk) {
      var creatorUserId = fromUserId && "" + fromUserId;

      var nonActive = [];
      var active = [];

      var userIds = Object.keys(userIdsWithLurk);

      _.each(userIds, function(userId) {
        if (creatorUserId && userId === creatorUserId) return;

        var lurk = userIdsWithLurk[userId];

        if (lurk) {
          nonActive.push(userId);
        } else {
          active.push(userId);
        }
      });

      if(!mentions || !mentions.length) {
        return {
          notifyUserIds: active,
          mentionUserIds: [],
          activityOnlyUserIds: nonActive,
          notifyNewRoomUserIds: [],
          announcement: false
        };
      }

      /* Add the mentions into the mix */
      return parseMentions(fromUserId, troupe, userIdsWithLurk, mentions)
        .then(function(parsedMentions) {
          var notifyUserIdsHash = {};
          _.each(active, function(userId) { notifyUserIdsHash[userId] = 1; });
          _.each(parsedMentions.mentionUserIds, function(userId) { notifyUserIdsHash[userId] = 1; });

          var nonActiveLessMentions = _.filter(nonActive, function(userId) {
            return !notifyUserIdsHash[userId];
          });

          return {
            notifyUserIds: Object.keys(notifyUserIdsHash),
            mentionUserIds: parsedMentions.mentionUserIds,
            activityOnlyUserIds: nonActiveLessMentions,
            notifyNewRoomUserIds: parsedMentions.nonMemberUserIds,
            announcement: parsedMentions.announcement
          };
        });

    })
    .then(function(distribution) {
      var allUserIds = distribution.notifyUserIds.concat(distribution.activityOnlyUserIds);

      // In future, this should take into account announcements
      return categoriseUserInRoom(troupeId, allUserIds)
        .then(function(presenceStatus) {
          distribution.presence = presenceStatus;
          return distribution;
        });
    });
}

module.exports = unreadItemDistribution;

module.exports.testOnly = {
  findNonMembersWithAccess: findNonMembersWithAccess,
  parseMentions: parseMentions
};
