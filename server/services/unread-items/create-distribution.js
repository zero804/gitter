'use strict';

var env                   = require('gitter-web-env');
var errorReporter         = env.errorReporter;
var _                     = require('lodash');
var Promise               = require('bluebird');
var Distribution          = require('./distribution');
var roomMembershipService = require('../room-membership-service');
var userService           = require("../user-service");
var roomPermissionsModel  = require('../room-permissions-model');
var categoriseUserInRoom  = require("../categorise-users-in-room");

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

/**
 * Given an array of mention objects returns
 * the userIds of the mentioned users, and
 * whether theres been an announcement
 */
function extractMentionInfo(fromUserId, mentions) {
  var fromUserIdString = fromUserId && String(fromUserId);

  if (!mentions || !mentions.length) {
    return {
      announcement: false,
      userIds: []
    };
  }

  var announcement = false;

  var uniqueUserIds = _.reduce(mentions, function(memo, mention) {
    if(mention.group) {
      if (mention.announcement) {
        announcement = true;
      } else {
        // Note: in future, annoucements won't have userIds for
        // the `all` group
        if (mention.userIds) {
          _.each(mention.userIds, function(userId) {
            if (!userId) return;
            var userIdString = String(userId);
            if (fromUserIdString === userIdString) return;
            memo[userId] = true;
          });
        }
      }
    } else {
      if(mention.userId) {
        var userIdString = String(mention.userId);
        if (fromUserIdString !== userIdString) {
          memo[userIdString] = true;
        }
      }
    }
    return memo;
  }, {});

  var userIds = Object.keys(uniqueUserIds);

  return {
    announcement: announcement,
    userIds: userIds
  };

}

function parseMentions(fromUserId, troupe, membersWithFlags, mentionUserIds, options) {
  var memberHash = _.reduce(membersWithFlags, function(memo, member) {
    memo[member.userId] = true;
    return memo;
  }, {});

  var nonMemberUserIds = _.filter(mentionUserIds, function(userId) {
    return !memberHash[userId];
  });

  /* Shortcut if we don't need to check for non-members */
  if(!nonMemberUserIds.length) {
    return Promise.resolve({
      membersWithFlags: membersWithFlags,
      mentions: mentionUserIds,
      nonMemberMentions: []
    });
  }

  var delta = options && options.delta;


  /* Lookup the non-members and check if they can access the room */
  return (delta ?
            Promise.resolve(nonMemberUserIds) :
            findNonMembersWithAccess(troupe, nonMemberUserIds))
    .then(function(nonMemberUserIdsFiltered) {

      var memberMentionUserIds = _.filter(mentionUserIds, function(userId) {
        return memberHash[userId];
      });

      return {
        membersWithFlags: membersWithFlags.concat(nonMemberUserIdsFiltered.map(function(userId) {
          return { userId: userId, flags: null }; // Flags: null means the user is not in the room
        })),
        mentions: memberMentionUserIds.concat(nonMemberUserIdsFiltered),
        nonMemberMentions: nonMemberUserIdsFiltered
      };
    });
}

function createDistribution(fromUserId, troupe, mentions, options) {
  var troupeId = troupe._id;
  var mentionInfo = extractMentionInfo(fromUserId, mentions);

  return roomMembershipService.findMembersForRoomForNotify(troupeId, fromUserId, mentionInfo.annoucement, mentionInfo.userIds)
    .then(function(membersWithFlags) {
      if (!mentionInfo.userIds.length) {
        return {
          membersWithFlags: membersWithFlags,
          announcement: mentionInfo.announcement
        };
      }

      /* Add the mentions into the mix */
      return parseMentions(fromUserId, troupe, membersWithFlags, mentionInfo.userIds, options)
        .then(function(parsedMentions) {

          return {
            membersWithFlags: parsedMentions.membersWithFlags,
            mentions: parsedMentions.mentions,
            nonMemberMentions: parsedMentions.nonMemberMentions,
            announcement: mentionInfo.announcement
          };
        });

    })
    .then(function(options) {
      // No need for presence for deltas
      if (options.delta) {
        return new Distribution(options);
      }

      var allUserIds = options.membersWithFlags.map(function(member) { return member.userId; });

      // In future, this should take into account announcements
      return categoriseUserInRoom(troupeId, allUserIds)
        .then(function(presenceStatus) {
          options.presence = presenceStatus;
          return new Distribution(options);
        });
    });
}

module.exports = createDistribution;

module.exports.testOnly = {
  findNonMembersWithAccess: findNonMembersWithAccess,
  parseMentions: parseMentions
};
