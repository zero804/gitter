'use strict';

var Promise = require('bluebird');
var LegacyPolicyEvaluator = require('./policies/legacy-policy-evaluator');

function createPolicyForRoom(user, room) {
  var userId = user && user._id;
  return new LegacyPolicyEvaluator(userId, user, room._id, room);
}

function createPolicyForRoomId(user, roomId) {
  var userId = user && user._id;
  return new LegacyPolicyEvaluator(userId, user, roomId, null);
}

module.exports = {
  createPolicyForRoom: Promise.method(createPolicyForRoom),
  createPolicyForRoomId: Promise.method(createPolicyForRoomId)
};
