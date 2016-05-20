'use strict';

var Promise = require('bluebird');
var LegacyPolicyEvaluator = require('./policies/legacy-policy-evaluator');
var LegacyGitHubPolicyEvaluator = require('./policies/legacy-github-policy-evaluator');
var LegacyGroupPolicyEvaluator = require('./policies/legacy-group-policy-evaluator');

function createPolicyForRoom(user, room) {
  var userId = user && user._id;
  return new LegacyPolicyEvaluator(userId, user, room._id, room);
}

function createPolicyForRoomId(user, roomId) {
  var userId = user && user._id;
  return new LegacyPolicyEvaluator(userId, user, roomId, null);
}

function createPolicyForUserIdInRoomId(userId, roomId) {
  return new LegacyPolicyEvaluator(userId, null, roomId, null);
}

function createPolicyForUserIdInRoom(userId, room) {
  return new LegacyPolicyEvaluator(userId, null, room._id, room);
}

function createPolicyForGithubObject(user, uri, ghType, security) {
  return new LegacyGitHubPolicyEvaluator(user, uri, ghType, security);
}

function createPolicyForOneToOne(user, toUser) {
  return new LegacyGitHubPolicyEvaluator(user, toUser.username, 'ONETOONE', null);
}

/**
 * NB: obtainAccessFromGitHubRepo is a stop-gap until we have proper
 * user-group permissions
 */
function createPolicyForGroup(user, group, obtainAccessFromGitHubRepo) {
  var userId = user && user._id;
  return new LegacyGroupPolicyEvaluator(userId, user, group._id, group, obtainAccessFromGitHubRepo);
}

module.exports = {
  createPolicyForRoom: Promise.method(createPolicyForRoom),
  createPolicyForRoomId: Promise.method(createPolicyForRoomId),
  createPolicyForUserIdInRoomId: Promise.method(createPolicyForUserIdInRoomId),
  createPolicyForUserIdInRoom: Promise.method(createPolicyForUserIdInRoom),
  createPolicyForGithubObject: Promise.method(createPolicyForGithubObject),
  createPolicyForOneToOne: Promise.method(createPolicyForOneToOne),
  createPolicyForGroup: Promise.method(createPolicyForGroup)
};
