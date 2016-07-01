'use strict';

var Promise = require('bluebird');
var PolicyEvaluator = require('./policies/policy-evaluator');
var OneToOnePolicyEvaluator = require('./policies/one-to-one-policy-evaluator');
var OneToOneUnconnectionPolicyEvalator = require('./policies/one-to-one-unconnected-policy-evaluator');
var RoomContextDelegate = require('./policies/room-context-delegate');
var OneToOneContextDelegate = require('./policies/one-to-one-room-context-delegate');
var GhRepoPolicyDelegate = require('./policies/gh-repo-policy-delegate');
var GhOrgPolicyDelegate = require('./policies/gh-org-policy-delegate');
var GhOrgPolicyDelegateWithRepoFallback = require('./policies/gh-org-policy-delegate-with-repo-fallback');
var GhUserPolicyDelegate = require('./policies/gh-user-policy-delegate');
var StatusError = require('statuserror');
var securityDescriptorService = require('./security-descriptor-service');
var userLoaderFactory = require('./user-loader-factory');
var debug = require('debug')('gitter:app:permissions:policy-factory');

function getDelegateForSecurityDescriptor(userId, user, securityDescriptor, obtainAccessFromGitHubRepo) {
  var userLoader = userLoaderFactory(userId, user);

  switch(securityDescriptor.type) {
    case 'GH_REPO':
      return new GhRepoPolicyDelegate(userId, userLoader, securityDescriptor);

    case 'GH_ORG':
      if (obtainAccessFromGitHubRepo) {

        return new GhOrgPolicyDelegateWithRepoFallback(userId, userLoader, securityDescriptor, obtainAccessFromGitHubRepo);
      } else {
        return new GhOrgPolicyDelegate(userId, userLoader, securityDescriptor);
      }

    case 'GH_USER':
      // TODO: consider adding obtainAccessFromGitHubRepo support here too..
      return new GhUserPolicyDelegate(userId, userLoader, securityDescriptor);
    default:
      return null;
  }
}

function createPolicyFromDescriptor(userId, user, securityDescriptor, roomId) {
  if (securityDescriptor.type === 'ONE_TO_ONE') {
    var oneToOneContextDelegate = new OneToOneContextDelegate(roomId);

    return new OneToOnePolicyEvaluator(userId, securityDescriptor, oneToOneContextDelegate);
  }

  var policyDelegate = getDelegateForSecurityDescriptor(userId, user, securityDescriptor);
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

      var policyDelegate = getDelegateForSecurityDescriptor(userId, user, securityDescriptor);
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

      var policyDelegate = getDelegateForSecurityDescriptor(userId, user, securityDescriptor, repoUri);
      var contextDelegate = null; // No group context yet

      return new PolicyEvaluator(user, securityDescriptor, policyDelegate, contextDelegate);
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

module.exports = {
  createPolicyForRoomId: Promise.method(createPolicyForRoomId),
  createPolicyForRoom: Promise.method(createPolicyForRoom),
  createPolicyForGroupId: Promise.method(createPolicyForGroupId),
  createPolicyForGroupIdWithRepoFallback: Promise.method(createPolicyForGroupIdWithRepoFallback),
  createPolicyForUserIdInRoomId: Promise.method(createPolicyForUserIdInRoomId),
  createPolicyForUserIdInRoom: Promise.method(createPolicyForUserIdInRoom),
  createPolicyForOneToOne: Promise.method(createPolicyForOneToOne),
};
