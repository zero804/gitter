'use strict';

var Promise = require('bluebird');
var persistence = require('gitter-web-persistence');
var PolicyEvaluator = require('./policies/policy-evaluator');
var RoomContextDelegate = require('./policies/room-context-delegate');
var GhRepoPolicyDelegate = require('./policies/gh-repo-policy-delegate');
var GhOrgPolicyDelegate = require('./policies/gh-org-policy-delegate');
var StatusError = require('statuserror');

function loadRoomPermissions(roomId, userId) {
  var projection = {
    _id: 0,
    type: 1,
    members: 1,
    admins: 1,
    public: 1,
    linkPath: 1,
    externalId: 1,
  };

  if (userId) {
    var elemMatch = { $elemMatch: { $eq: userId } };
    projection.bans = elemMatch;
    projection.extraMembers = elemMatch;
    projection.extraAdmins = elemMatch;
  }

  return persistence.Troupe.findById(roomId, projection, { lean: true })
    .exec();
}

function getDelegateForPolicy(user, perms) {
  switch(perms && perms.type) {
    case 'GH_REPO':
      return new GhRepoPolicyDelegate(user, perms);
    case 'GH_ORG':
      return new GhOrgPolicyDelegate(user, perms);
    default:
      return null;
  }
}

function createPolicyForRoomId(user, roomId) {
  var userId = user && user._id;

  return loadRoomPermissions(roomId, userId)
    .then(function(roomPerms) {
      if (!roomPerms) throw new StatusError(404);

      var policyDelegate = getDelegateForPolicy(user, roomPerms);
      var contextDelegate = new RoomContextDelegate(roomId);

      return new PolicyEvaluator(user, roomPerms, policyDelegate, contextDelegate);
    });
}

module.exports = {
  createPolicyForRoomId: Promise.method(createPolicyForRoomId),
  testOnly: {
    loadRoomPermissions: loadRoomPermissions
  }
};
