'use strict';

var Promise = require('bluebird');
var PolicyEvaluator = require('./policies/policy-evaluator');
var OneToOnePolicyEvaluator = require('./policies/one-to-one-policy-evaluator');
var OneToOneUnconnectionPolicyEvalator = require('./policies/one-to-one-unconnected-policy-evaluator');
var RoomContextDelegate = require('./policies/room-context-delegate');
var OneToOneContextDelegate = require('./policies/one-to-one-room-context-delegate');
var StatusError = require('statuserror');
var securityDescriptorService = require('./security-descriptor-service');
var debug = require('debug')('gitter:app:permissions:policy-factory');
var PreCreationGhRepoPolicyEvaluator = require('./pre-creation/gh-repo-policy-evaluator');
var PreCreationGhOrgPolicyEvaluator = require('./pre-creation/gh-org-policy-evaluator');
var PreCreationGhUserPolicyEvaluator = require('./pre-creation/gh-user-policy-evaluator');
var FallbackPolicyEvaluator = require('./pre-creation/fallback-policy-evaluator');
var policyDelegateFactory = require('./policy-delegate-factory');

function createPolicyFromDescriptor(userId, user, securityDescriptor, roomId) {
  if (securityDescriptor.type === 'ONE_TO_ONE') {
    var oneToOneContextDelegate = new OneToOneContextDelegate(roomId);

    return new OneToOnePolicyEvaluator(userId, securityDescriptor, oneToOneContextDelegate);
  }

  var policyDelegate = policyDelegateFactory(userId, user, securityDescriptor);
  var contextDelegate = new RoomContextDelegate(roomId);

  return new PolicyEvaluator(userId, securityDescriptor, policyDelegate, contextDelegate);
}

function createPolicyForRoomId(user, roomId) {
  var userId = user && user._id;

  return securityDescriptorService.getForRoomUser(roomId, userId)
    .then(function(securityDescriptor) {
      if (!securityDescriptor) throw new StatusError(404);

      return createPolicyFromDescriptor(userId, user, securityDescriptor, roomId);
    });
}

function createPolicyForRoom(user, room) {
  var roomId = room._id;
  var userId = user && user._id;

  // TODO: optimise this as we may already have the information we need on the room...
  // in which case we shouldn't have to refetch it from mongo
  return securityDescriptorService.getForRoomUser(roomId, userId)
    .then(function(securityDescriptor) {
      if (!securityDescriptor) throw new StatusError(404);

      return createPolicyFromDescriptor(userId, user, securityDescriptor, roomId);
    });
}

function createPolicyForGroupId(user, groupId) {
  var userId = user && user._id;

  return securityDescriptorService.getForGroupUser(groupId, userId)
    .then(function(securityDescriptor) {
      if (!securityDescriptor) throw new StatusError(404);

      var policyDelegate = policyDelegateFactory(userId, user, securityDescriptor);
      var contextDelegate = null; // No group context yet

      return new PolicyEvaluator(user, securityDescriptor, policyDelegate, contextDelegate);
    });
}

function createPolicyForGroupIdWithRepoFallback(user, groupId, repoUri) {
  debug('Create policy factory with repo fallback: repo=%s', repoUri);
  var userId = user && user._id;

  return securityDescriptorService.getForGroupUser(groupId, userId)
    .then(function(securityDescriptor) {
      if (!securityDescriptor) throw new StatusError(404);

      var policyDelegate = policyDelegateFactory(userId, user, securityDescriptor);
      var contextDelegate = null; // No group context yet

      var primary = new PolicyEvaluator(user, securityDescriptor, policyDelegate, contextDelegate);
      var secondary = new PreCreationGhRepoPolicyEvaluator(user, repoUri);

      return new FallbackPolicyEvaluator(primary, secondary);
    });
}

function createPolicyForUserIdInRoomId(userId, roomId) {
  return securityDescriptorService.getForRoomUser(roomId, userId)
    .then(function(securityDescriptor) {
      if (!securityDescriptor) throw new StatusError(404);

      return createPolicyFromDescriptor(userId, null, securityDescriptor, roomId);
    });
}

function createPolicyForUserIdInRoom(userId, room) {
  var roomId = room._id;

  return securityDescriptorService.getForRoomUser(roomId, userId)
    .then(function(securityDescriptor) {
      if (!securityDescriptor) throw new StatusError(404);

      return createPolicyFromDescriptor(userId, null, securityDescriptor, roomId);
    });
}

function createPolicyForOneToOne(user, toUser) {
  return new OneToOneUnconnectionPolicyEvalator(user, toUser);
}


/**
 * Pre-creation Policy Evaluator factory
 */
function getPreCreationPolicyEvaluator(user, type, uri) {
  switch (type) {
    case 'GH_ORG':
      return new PreCreationGhOrgPolicyEvaluator(user, uri);

    case 'GH_REPO':
      return new PreCreationGhRepoPolicyEvaluator(user, uri);

    case 'GH_USER':
      return new PreCreationGhUserPolicyEvaluator(user, uri);

    default:
      throw new StatusError(400, 'type is not known: ' + type);
  }

}

function getPreCreationPolicyEvaluatorWithRepoFallback(user, type, uri, fallbackRepoUri) {
  var primary = getPreCreationPolicyEvaluator(user, type, uri);
  if (!fallbackRepoUri) {
    return primary;
  }

  // Use a fallback policy evaluator

  // TODO: Should we be checking here that the repo is under the primary?
  var secondary = new PreCreationGhRepoPolicyEvaluator(user, fallbackRepoUri);
  return new FallbackPolicyEvaluator(primary, secondary);
}


module.exports = {
  createPolicyForRoomId: Promise.method(createPolicyForRoomId),
  createPolicyForRoom: Promise.method(createPolicyForRoom),
  createPolicyForGroupId: Promise.method(createPolicyForGroupId),
  createPolicyForGroupIdWithRepoFallback: Promise.method(createPolicyForGroupIdWithRepoFallback),
  createPolicyForUserIdInRoomId: Promise.method(createPolicyForUserIdInRoomId),
  createPolicyForUserIdInRoom: Promise.method(createPolicyForUserIdInRoom),
  createPolicyForOneToOne: Promise.method(createPolicyForOneToOne),

  // For things that have not yet been created
  getPreCreationPolicyEvaluator: getPreCreationPolicyEvaluator,
  getPreCreationPolicyEvaluatorWithRepoFallback: getPreCreationPolicyEvaluatorWithRepoFallback

};
