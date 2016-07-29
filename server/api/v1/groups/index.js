"use strict";

var Promise = require('bluebird');
var restful = require("../../../services/restful");
var StatusError = require('statuserror');
var groupService = require('gitter-web-groups/lib/group-service');
var restSerializer = require('../../../serializers/rest-serializer');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var GroupWithPolicyService = require('../../../services/group-with-policy-service');
var RoomWithPolicyService = require('../../../services/room-with-policy-service');
var inviteValidation = require('gitter-web-invites/lib/invite-validation');

var MAX_BATCHED_INVITES = 100;

function getGroupOptions(input) {
  var uri = input.uri ? String(input.uri) : undefined;
  var name = input.name ? String(input.name) : undefined;

  var groupOptions = { uri: uri, name: name };
  if (input.security) {
    // for GitHub and future group types that are backed by other services
    groupOptions.type = input.security.type ? String(input.security.type) : undefined;
    groupOptions.linkPath = input.security.linkPath ? String(input.security.linkPath) : undefined;
  }

  return groupOptions;
}

function getInvites(invitesInput) {
  if (invitesInput && invitesInput.length) {
    if (invitesInput.length > MAX_BATCHED_INVITES) {
      throw new StatusError(400, 'Too many batched invites.');
    }

    // This could throw, but it is the basic user-input validation that would
    // have failed if the frontend didn't call the invite checker API like it
    // should have anyway.
    return invitesInput.map(function(input) {
      return inviteValidation.parseAndValidateInput(input);
    });
  }

  // invites are optional
  return [];
}

function getRoomOptions(group, input) {
  var defaultRoomName = input.defaultRoomName || 'Lobby';

  var roomOptions = {
    name: defaultRoomName,
    // default rooms are always public
    security: 'PUBLIC',
    // use the same backing object for the default room
    type: group.sd.type,
    linkPath: group.sd.linkPath,
    // only github repo based rooms have the default room automatically
    // integrated with github
    runPostGitHubRoomCreationTasks: group.sd.type === 'GH_REPO',
    addBadge: !!input.addBadge
  };

  if (input.providers && Array.isArray(input.providers)) {
    roomOptions.providers = input.providers;
  }

  return roomOptions;
}

module.exports = {
  id: 'group',

  index: function(req) {
    if (!req.user) {
      throw new StatusError(401);
    }

    var lean = req.query.lean && parseInt(req.query.lean, 10) || false;

    if (req.query.type === 'admin') {
      return restful.serializeAdminGroupsForUser(req.user, { lean: lean })
    }

    return restful.serializeGroupsForUserId(req.user._id, { lean: lean });
  },

  create: function(req) {
    var user = req.user;

    if (!req.user) {
      throw new StatusError(401);
    }

    if (!req.authInfo || req.authInfo.client.clientKey !== 'web-internal') {
      // This is a private API
      throw new StatusError(404);
    }

    var groupOptions = getGroupOptions(req.body);

    var invites = getInvites(req.body.invites);

    var group;
    var room;

    return groupService.createGroup(user, groupOptions)
      .then(function(_group) {
        group = _group
        return policyFactory.createPolicyForGroupId(req.user, group._id);
      })
      .then(function(userGroupPolicy) {
        var groupWithPolicyService = new GroupWithPolicyService(group, req.user, userGroupPolicy);

        var roomOptions = getRoomOptions(group, req.body);

        return groupWithPolicyService.createRoom(roomOptions);
      })
      .then(function(_room) {
        room = _room;
        return policyFactory.createPolicyForRoomId(req.user, room._id);
      })
      .then(function(userRoomPolicy) {
        var roomWithPolicyService = new RoomWithPolicyService(room, req.user, userRoomPolicy);
        // Some of these can fail, but the errors will be caught and added to
        // the report that the promise resolves to.
        return roomWithPolicyService.createRoomInvitations(invites);
      })
      .then(function(invitesReport) {
        var groupStrategy = new restSerializer.GroupStrategy();
        var troupeStrategy = new restSerializer.TroupeStrategy({
          currentUserId: req.user.id,
          includeTags: true,
          includePermissions: true,
          includeProviders: true,
          includeBackend: true
        });

        return Promise.join(
            restSerializer.serializeObject(group, groupStrategy),
            restSerializer.serializeObject(room, troupeStrategy),
            function(serializedGroup, serializedRoom) {
              serializedGroup.defaultRoom = serializedRoom;
              return serializedGroup;
            }
          );
      });
  },

  show: function(req) {
    var group = req.params.group;
    var user = req.user;
    var userId = user && user._id;

    var strategy = new restSerializer.GroupStrategy({ currentUserId: userId, currentUser: user });
    return restSerializer.serializeObject(group, strategy);
  },

  load: function(req, id) {
    return policyFactory.createPolicyForGroupId(req.user, id)
      .then(function(policy) {
        // TODO: middleware?
        req.userGroupPolicy = policy;

        return req.method === 'GET' ?
          policy.canRead() :
          policy.canWrite();
      })
      .then(function(access) {
        if (!access) return null;

        return groupService.findById(id);
      });
  },

  subresources: {
    'rooms': require('./rooms'),
    'suggestedRooms': require('./suggested-rooms')
  }

};
