'use strict';

var Promise = require('bluebird');
var PolicyEvaluator = require('./policies/policy-evaluator');
var OneToOnePolicyEvaluator = require('./policies/one-to-one-policy-evaluator');
var RoomContextDelegate = require('./policies/room-context-delegate');
var OneToOneContextDelegate = require('./policies/one-to-one-room-context-delegate');
var GhRepoPolicyDelegate = require('./policies/gh-repo-policy-delegate');
var GhOrgPolicyDelegate = require('./policies/gh-org-policy-delegate');
var GhOrgPolicyDelegateWithRepoFallback = require('./policies/gh-org-policy-delegate-with-repo-fallback');
var GhUserPolicyDelegate = require('./policies/gh-user-policy-delegate');
var StatusError = require('statuserror');
var securityDescriptorService = require('./security-descriptor-service');
var debug = require('debug')('gitter:app:permissions:policy-factory');

function getDelegateForSecurityDescriptor(user, securityDescriptor, obtainAccessFromGitHubRepo) {
  switch(securityDescriptor.type) {
    case 'GH_REPO':
      return new GhRepoPolicyDelegate(user, securityDescriptor);
    case 'GH_ORG':
      if (obtainAccessFromGitHubRepo) {
        return new GhOrgPolicyDelegateWithRepoFallback(user, securityDescriptor, obtainAccessFromGitHubRepo);
      } else {
        return new GhOrgPolicyDelegate(user, securityDescriptor);
      }
    case 'GH_USER':
      return new GhUserPolicyDelegate(user, securityDescriptor);
    default:
      return null;
  }
}

function createPolicyFromDescriptor(user, securityDescriptor, roomId) {
  if (securityDescriptor.type === 'ONE_TO_ONE') {
    var oneToOneContextDelegate = new OneToOneContextDelegate(roomId);

    return new OneToOnePolicyEvaluator(user, securityDescriptor, oneToOneContextDelegate);
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

function createPolicyForGroupId(user, groupId) {
  var userId = user && user._id;

  return securityDescriptorService.getForGroupUser(groupId, userId)
    .then(function(securityDescriptor) {
      if (!securityDescriptor) throw new StatusError(404);

      var policyDelegate = getDelegateForSecurityDescriptor(user, securityDescriptor);
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

      var policyDelegate = getDelegateForSecurityDescriptor(user, securityDescriptor, repoUri);
      var contextDelegate = null; // No group context yet

      return new PolicyEvaluator(user, securityDescriptor, policyDelegate, contextDelegate);
    });
}

module.exports = {
  createPolicyForRoomId: Promise.method(createPolicyForRoomId),
  createPolicyForGroupId: Promise.method(createPolicyForGroupId),
  createPolicyFromDescriptor: createPolicyFromDescriptor,
  createPolicyForGroupIdWithRepoFallback: Promise.method(createPolicyForGroupIdWithRepoFallback)
};
