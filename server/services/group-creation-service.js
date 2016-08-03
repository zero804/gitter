"use strict";

var Promise = require('bluebird');
var groupService = require('gitter-web-groups/lib/group-service');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var GroupWithPolicyService = require('./group-with-policy-service');
var RoomWithPolicyService = require('./room-with-policy-service');

/**
 * @private
 */
function getRoomOptions(group, options) {
  var defaultRoomOptions = options.defaultRoom;
  var defaultRoomName = defaultRoomOptions.defaultRoomName || 'Lobby';

  var roomOptions = {
    name: defaultRoomName,
    // default rooms are always public
    security: 'PUBLIC',
    // use the same backing object for the default room
    type: 'GROUP',
    // only github repo based rooms have the default room automatically
    // integrated with github
    runPostGitHubRoomCreationTasks: group.sd.type === 'GH_REPO', // TODO: THIS IS GOING TO FAIL.....
    addBadge: defaultRoomOptions.addBadge,
    providers: defaultRoomOptions.providers
  };

  return roomOptions;
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
      invitesReport: null
    })
    .then(function(group) {
      this.group = group;
      return policyFactory.createPolicyForGroupId(user, group._id);
    })
    .then(function(userGroupPolicy) {
      var group = this.group;
      var groupWithPolicyService = new GroupWithPolicyService(this.group, user, userGroupPolicy);

      var roomOptions = getRoomOptions(group, options);
      return groupWithPolicyService.createRoom(roomOptions);
    })
    .then(function(defaultRoom) {
      this.defaultRoom = defaultRoom;

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
      return this;
    });
}

module.exports = Promise.method(groupCreationService);
