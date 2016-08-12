"use strict";

var env = require('gitter-web-env');
var logger = env.logger;
var errorReporter = env.errorReporter;
var stats = env.stats;

var Promise = require('bluebird');
var groupService = require('gitter-web-groups/lib/group-service');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var GroupWithPolicyService = require('./group-with-policy-service');
var RoomWithPolicyService = require('./room-with-policy-service');
var clientEnv = require('gitter-client-env');
var twitterBadger = require('gitter-web-twitter/lib/twitter-badger');
var identityService = require('gitter-web-identity');
var debug = require('debug')('gitter:app:group-creation-service');

/**
 * @private
 * @return inviteReport
 */
var sendInvitesForRoom = Promise.method(function(user, room, invites) {
  if (!invites || !invites.length) return;

  // Invite all the users
  return policyFactory.createPolicyForRoomId(user, room._id)
    .then(function(userRoomPolicy) {
      var roomWithPolicyService = new RoomWithPolicyService(room, user, userRoomPolicy);

      debug('Sending invites: %j', invites);

      // Some of these can fail, but the errors will be caught and added to
      // the report that the promise resolves to.
      return roomWithPolicyService.createRoomInvitations(invites);
    })
});

/**
 * @private
 */
var sendTweetsForRoom = Promise.method(function(user, group, room, twitterHandles) {
  if (!twitterHandles.length) return;

  return identityService.getIdentityForUser(user, 'twitter')
    .then(function(identity) {
      if (!identity) return;

      user.twitterUsername = identity.username;


      debug('Sending tweets to: %j', twitterHandles);

      var usersToTweet = twitterHandles.map(function(twitterUsername) {
        return {
          twitterUsername: twitterUsername
        };
      });

      var roomUrl = room.lcUri ? (clientEnv['basePath'] + '/' + room.lcUri) : undefined;

      stats.event('new_group_tweets', {
        userId: user.id,
        username: user.username,
        groupId: group._id,
        groupUri: group.uri,
        count: usersToTweet.length
      });

      return twitterBadger.sendUserInviteTweets(user, usersToTweet, room.name, roomUrl);
    });
});

/**
 * @private
 */
function sendInvitesAndTweetsPostRoomCreation(user, group, room, invites, allowTweeting) {
  return sendInvitesForRoom(user, room, invites)
    .tap(function(invitesReport) {
      var successes = invitesReport.reduce(function(memo, report) {
        if (report.status === 'added') {
          memo++;
        }
        return memo;
      }, 0);

      stats.event('new_group_invites', {
        userId: user.id,
        username: user.username,
        groupId: group._id,
        groupUri: group.uri,
        count: successes
      });

      var twitterHandles = invitesReport
        .filter(function(report) {
          return report.status === 'error' &&
            report.inviteInfo.type === 'twitter' &&
            report.inviteInfo.externalId;
        })
        .map(function(report) {
          return report.inviteInfo.externalId;
        });


      if (!allowTweeting) return;

      return sendTweetsForRoom(user, group, room, twitterHandles)
        .catch(function(err) {
          logger.error('Send tweets failed', { exception: err });
          errorReporter(err, { post_room_creation: "failed", step: "tweets" }, { module: 'group-creation' });
        });
    })
    .catch(function(err) {
      logger.error('Send invites failed', { exception: err });
      errorReporter(err, { post_room_creation: "failed", step: "invites" }, { module: 'group-creation' });
      return []; // No invites report for you
    });

}

/**
 * Create a group with a default room and invite some people
 *
 * Returns
 *  {
 *    group: ...,
 *    defaultRoom: ...,
 *    invitesReport: ...
 *  }
 */
function groupCreationService(user, options) {
  var invites = options.invites;
  var defaultRoomOptions = options.defaultRoom;
  var allowTweeting = options.allowTweeting;
  return groupService.createGroup(user, options)
    .bind({
      group: null,
      defaultRoom: null,
      invitesReport: null,
      hookCreationFailedDueToMissingScope: null
    })
    .then(function(group) {
      this.group = group;
      return policyFactory.createPolicyForGroupId(user, group._id);
    })
    .then(function(userGroupPolicy) {
      var group = this.group;
      var groupWithPolicyService = new GroupWithPolicyService(this.group, user, userGroupPolicy);

      var defaultRoomName = defaultRoomOptions.defaultRoomName || 'Lobby';

      return groupWithPolicyService.createRoom({
        name: defaultRoomName,

        // default rooms are always public
        security: 'PUBLIC',

        // New way:
        // type: 'GROUP',

        // Old way
        // use the same backing object for the default room
        type: group.sd.type,
        linkPath: group.sd.linkPath,

        // only github repo based rooms have the default room automatically
        // integrated with github
        // This is going to have to change in the new GROUP world
        runPostGitHubRoomCreationTasks: group.sd.type === 'GH_REPO',

        addBadge: defaultRoomOptions.addBadge,
        providers: defaultRoomOptions.providers
      });
    })
    .then(function(createRoomResult) {
      this.hookCreationFailedDueToMissingScope = createRoomResult.hookCreationFailedDueToMissingScope;
      var defaultRoom = this.defaultRoom = createRoomResult.troupe;

      return sendInvitesAndTweetsPostRoomCreation(user, this.group, defaultRoom, invites, allowTweeting);
    })
    .then(function(invitesReport) {
      var group = this.group;
      stats.event('new_group', { userId: user.id, username: user.username, groupId: group._id, groupUri: group.uri });

      this.invitesReport = invitesReport;
      return this;
    });
}

module.exports = Promise.method(groupCreationService);
