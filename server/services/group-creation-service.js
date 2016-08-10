"use strict";

var Promise = require('bluebird');
var groupService = require('gitter-web-groups/lib/group-service');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var GroupWithPolicyService = require('./group-with-policy-service');
var RoomWithPolicyService = require('./room-with-policy-service');
var clientEnv = require('gitter-client-env');
var TwitterBadger = require('gitter-web-twitter/lib/twitter-badger');
var identityService = require('gitter-web-identity');

function inviteTroubleTwitterUsers(user, room, invitesReport) {
  return identityService.getIdentityForUser(user, 'twitter')
    .then(function(identity) {
      if (!identity) return;
      
      user.twitterUsername = identity.username;

      var usersToTweet = [];
      invitesReport.forEach(function(report) {
        if(report.status === 'error' && report.inviteInfo.type === 'twitter') {
          usersToTweet.push({
            twitterUsername: report.inviteInfo.externalId
          });
        }
      });

      var roomUrl = room.lcUri ? (clientEnv['basePath'] + '/' + room.lcUri) : undefined;

      return TwitterBadger.sendUserInviteTweets(user, usersToTweet, room.name, roomUrl);
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

      var defaultRoomOptions = options.defaultRoom;
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

      if (!options.invites || !options.invites.length) {
        // No invites to send out....
        return [];
      }

      // Invite all the users
      return policyFactory.createPolicyForRoomId(user, defaultRoom._id)
        .then(function(userRoomPolicy) {
          var roomWithPolicyService = new RoomWithPolicyService(defaultRoom, user, userRoomPolicy);

          // Some of these can fail, but the errors will be caught and added to
          // the report that the promise resolves to.
          return roomWithPolicyService.createRoomInvitations(options.invites);
        });
    })
    .then(function(invitesReport) {
      this.invitesReport = invitesReport;

      if (!options.allowTweeting) {
        return this;
      }

      // Tweet all the users
      return inviteTroubleTwitterUsers(user, this.defaultRoom, invitesReport)
        .return(this);
    });
}

module.exports = Promise.method(groupCreationService);
