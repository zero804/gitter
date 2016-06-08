'use strict';

var Promise = require('bluebird');
var LegacyPolicyEvaluator = require('./policies/legacy-policy-evaluator');
var LegacyGitHubPolicyEvaluator = require('./policies/legacy-github-policy-evaluator');

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

function createPolicyForOneToOne(user, toUser) {
  return new LegacyGitHubPolicyEvaluator(user, toUser.username, 'ONETOONE', null);
}

module.exports = {
  createPolicyForRoom: Promise.method(createPolicyForRoom),
  createPolicyForRoomId: Promise.method(createPolicyForRoomId),
  createPolicyForUserIdInRoomId: Promise.method(createPolicyForUserIdInRoomId),
  createPolicyForUserIdInRoom: Promise.method(createPolicyForUserIdInRoom),
  createPolicyForOneToOne: Promise.method(createPolicyForOneToOne),
};
