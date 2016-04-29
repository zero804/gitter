'use strict';

var Promise = require('bluebird');
var PolicyEvaluator = require('./policies/policy-evaluator');
var OneToOnePolicyEvaluator = require('./policies/one-to-one-policy-evaluator');
var RoomContextDelegate = require('./policies/room-context-delegate');
var GhRepoPolicyDelegate = require('./policies/gh-repo-policy-delegate');
var GhOrgPolicyDelegate = require('./policies/gh-org-policy-delegate');
var StatusError = require('statuserror');
var securityDescriptorService = require('./security-descriptor-service');

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

  return securityDescriptorService.getForRoomUser(roomId, userId)
    .then(function(roomPerms) {
      if (!roomPerms) throw new StatusError(404);

      if (roomPerms.oneToOne) {
        return new OneToOnePolicyEvaluator(user, roomPerms);
      }

      var policyDelegate = getDelegateForPolicy(user, roomPerms);
      var contextDelegate = new RoomContextDelegate(roomId);

      return new PolicyEvaluator(user, roomPerms, policyDelegate, contextDelegate);
    });
}

/**
 * Only used during the migration. Remove this later.
 */
function createPolicyFromDescriptor(user, roomPerms, roomId) {
  if (roomPerms.type === 'ONE_TO_ONE') {
    return new OneToOnePolicyEvaluator(user, roomPerms);
  }

  var policyDelegate = getDelegateForPolicy(user, roomPerms);
  var contextDelegate = new RoomContextDelegate(roomId);

  return new PolicyEvaluator(user, roomPerms, policyDelegate, contextDelegate);

}

module.exports = {
  createPolicyForRoomId: Promise.method(createPolicyForRoomId),
  createPolicyFromDescriptor: createPolicyFromDescriptor,
};
