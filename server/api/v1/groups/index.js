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


function processInvitesReport(invitesInput, report) {
  /*
  We might have to mask some emails and serialize some users so that the
  response looks similar to when you just add a user to a room one by one. Some
  errors got intercepted and now form part of the report and they just get
  passed through.
  */

  return Promise.map(report, Promise.method(function(result, index) {
    // deal with the intercepted errors up front
    if (result.status === 'error') {
      return result; // status, statusCode
    }

    var input = invitesInput[index];

    // TODO: This is actually the same as some code in v1/rooms/invite, but it
    // uses restful, so unclear where best to put it.

    var avatarUrl = inviteValidation.getAvatar(input.type, input.externalId, result.emailAddress);

    if (!input.emailAddress && result.emailAddress) {
      result.emailAddress = inviteValidation.maskEmail(result.emailAddress);
    }

    if (!result.user) {
      return {
        status: result.status,
        email: result.emailAddress,
        avatarUrl: avatarUrl
      }
    }

    var strategy = new restSerializer.UserStrategy();
    return restSerializer.serializeObject(result.user, strategy)
      .then(function(serializedUser) {
        return {
          status: result.status,
          email: result.emailAddress,
          user: serializedUser,
          avatarUrl: avatarUrl
        }
      });
  }));
}

module.exports = {
  id: 'group',

  index: function(req) {
    if (!req.user) {
      throw new StatusError(401);
    }

    var lean = req.query.lean && parseInt(req.query.lean, 10) || false;

    return restful.serializeGroupsForUserId(req.user._id, { lean: lean });
  },

  create: function(req) {
    var user = req.user;

    if (!req.user) {
      throw new StatusError(401);
    }

    if (!req.authInfo || !req.authInfo.clientKey === 'web-internal') {
      // This is a private API
      throw new StatusError(404);
    }

    var uri = req.body.uri ? String(req.body.uri) : undefined;
    var name = req.body.name ? String(req.body.name) : undefined;
    var groupOptions = { uri: uri, name: name };
    if (req.body.security) {
      // for GitHub and future group types that are backed by other services
      groupOptions.type = req.body.security.type ? String(req.body.security.type) : undefined;
      groupOptions.linkPath = req.body.security.linkPath ? String(req.body.security.linkPath) : undefined;
    }

    var invitesInput;
    if (req.body.invites && req.body.invites.length) {
      if (req.body.invites.length > MAX_BATCHED_INVITES) {
        throw new StatusError(400, 'Too many batched invites.');
      }

      // This could throw, but it is the basic user-input validation that would
      // have failed if the frontend didn't call the invite checker API like it
      // should have anyway.
      invitesInput = req.body.invites.map(function(input) {
        return inviteValidation.parseAndValidateInput(input);
      });
    } else {
      // invites are optional
      invitesInput = [];
    }

    var group;
    var room;

    return groupService.createGroup(user, groupOptions)
      .then(function(_group) {
        group = _group
        return policyFactory.createPolicyForGroupId(req.user, group._id);
      })
      .then(function(userGroupPolicy) {
        var groupWithPolicyService = new GroupWithPolicyService(group, req.user, userGroupPolicy);

        var defaultRoomName = req.body.defaultRoomName || 'Lobby';
        var roomOptions = {
          name: defaultRoomName,
          // default rooms are always public
          security: 'PUBLIC',
          // use the same backing object for the default room
          type: group.sd.type,
          linkPath: group.sd.linkPath
        };

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
        return roomWithPolicyService.createRoomInvitations(invitesInput);
      })
      .then(function(invitesReport) {
        var inviteResults = processInvitesReport(invitesInput, invitesReport);

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
              // invitesResults is an array of simple js objects
              serializedGroup.inviteResults = inviteResults;
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
  }

};
