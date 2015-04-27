"use strict";

var _ = require("underscore");

/* Returns a list of userIds in this troupe */
function getUserIds(troupe) {
  return troupe.users.map(function(troupeUser) { return troupeUser.userId; });
}
exports.getUserIds = getUserIds;

/* Find a troupeUser by userId  */
function findTroupeUser(troupe, userId) {
  userId = userId  ? "" + userId : null;
  var user = _.find(troupe.users, function(troupeUser) {
    return "" + troupeUser.userId == userId;
  });

  return user;
}
exports.findTroupeUser = findTroupeUser;

/* Does this troupe contain a given userId ? */
function containsUserId(troupe, userId) {
  return !!troupe.findTroupeUser(userId);
}
exports.containsUserId = containsUserId;

/* In a one-to-one troupe, return the OTHER user given a known user */
function getOtherOneToOneUserId(troupe, knownUserId) {
  knownUserId = knownUserId  ? "" + knownUserId : null;
  var troupeUser = _.find(troupe.users, function(troupeUser) {
    return "" + troupeUser.userId != knownUserId;
  });

  return troupeUser && troupeUser.userId;
}
exports.getOtherOneToOneUserId = getOtherOneToOneUserId;
