'use strict';

var Promise = require('bluebird');
var PolicyEvaluator = require('./policies/policy-evaluator');
var OneToOnePolicyEvaluator = require('./policies/one-to-one-policy-evaluator');
var RoomContextDelegate = require('./policies/room-context-delegate');
var GhRepoPolicyDelegate = require('./policies/gh-repo-policy-delegate');
var GhOrgPolicyDelegate = require('./policies/gh-org-policy-delegate');
var StatusError = require('statuserror');
var securityDescriptorService = require('./security-descriptor-service');

function getDelegateForSecurityDescriptor(user, securityDescriptor) {
  switch(securityDescriptor.type) {
    case 'GH_REPO':
      return new GhRepoPolicyDelegate(user, securityDescriptor);
    case 'GH_ORG':
      return new GhOrgPolicyDelegate(user, securityDescriptor);
    default:
      return null;
  }
}

function createPolicyFromDescriptor(user, securityDescriptor, roomId) {
  if (securityDescriptor.type === 'ONE_TO_ONE') {
    return new OneToOnePolicyEvaluator(user, securityDescriptor);
  }

  var policyDelegate = getDelegateForSecurityDescriptor(user, securityDescriptor);
  var contextDelegate = new RoomContextDelegate(roomId);

  return new PolicyEvaluator(user, securityDescriptor, policyDelegate, contextDelegate);
}

function createPolicyForRoomId(user, roomId) {
  var userId = user && user._id;

  return securityDescriptorService.getForRoomUser(roomId, userId)
    .then(function(securityDescriptor) {
      if (!securityDescriptor) throw new StatusError(404);

      return createPolicyFromDescriptor(user, securityDescriptor, roomId);
    });
}

module.exports = {
  createPolicyForRoomId: Promise.method(createPolicyForRoomId),
  createPolicyFromDescriptor: createPolicyFromDescriptor,
};
